import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Schema bootstrap — called once on first request
// ---------------------------------------------------------------------------
let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  const db = getPool();

  // Tenants — one row per ServiceM8 account
  await db.query(`
    CREATE TABLE IF NOT EXISTS sm_tenants (
      id SERIAL PRIMARY KEY,
      sm_account_uuid TEXT NOT NULL UNIQUE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expires_at TIMESTAMPTZ,
      company_name TEXT,
      supplier_name TEXT,
      supplier_email TEXT,
      supplier_phone TEXT,
      vat_rate NUMERIC(5,4) DEFAULT 0.20,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await db.query(`ALTER TABLE sm_tenants ADD COLUMN IF NOT EXISTS supplier_name TEXT`);
  await db.query(`ALTER TABLE sm_tenants ADD COLUMN IF NOT EXISTS supplier_email TEXT`);
  await db.query(`ALTER TABLE sm_tenants ADD COLUMN IF NOT EXISTS supplier_phone TEXT`);
  await db.query(`ALTER TABLE sm_tenants ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,4) DEFAULT 0.20`);

  // Product categories
  await db.query(`
    CREATE TABLE IF NOT EXISTS sm_categories (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES sm_tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // Glass products (priced per m²)
  await db.query(`
    CREATE TABLE IF NOT EXISTS sm_products (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES sm_tenants(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES sm_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      thickness TEXT,
      unit TEXT NOT NULL DEFAULT 'm2',
      sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      cost_price NUMERIC(10,2) DEFAULT 0,
      min_width_mm INTEGER,
      max_width_mm INTEGER,
      min_height_mm INTEGER,
      max_height_mm INTEGER,
      min_m2 NUMERIC(10,3),
      pattern_name TEXT,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // Migrate: add new columns if they don't exist yet
  await db.query(`ALTER TABLE sm_products ADD COLUMN IF NOT EXISTS min_m2 NUMERIC(10,3)`);
  await db.query(`ALTER TABLE sm_products ADD COLUMN IF NOT EXISTS pattern_name TEXT`);

  // Operations (edges, Georgian bars, delivery etc.)
  await db.query(`
    CREATE TABLE IF NOT EXISTS sm_operations (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES sm_tenants(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES sm_categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL DEFAULT 'item',
      sell_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      cost_price NUMERIC(10,2) DEFAULT 0,
      active BOOLEAN DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  schemaReady = true;
}

// ---------------------------------------------------------------------------
// Tenant helpers
// ---------------------------------------------------------------------------
export async function getTenantByUuid(smAccountUuid: string) {
  const db = getPool();
  const { rows } = await db.query(
    "SELECT * FROM sm_tenants WHERE sm_account_uuid = $1",
    [smAccountUuid]
  );
  return rows[0] ?? null;
}

export async function upsertTenant(opts: {
  smAccountUuid: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  companyName?: string;
}) {
  const db = getPool();
  const { rows } = await db.query(
    `INSERT INTO sm_tenants (sm_account_uuid, access_token, refresh_token, token_expires_at, company_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (sm_account_uuid) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       token_expires_at = EXCLUDED.token_expires_at,
       company_name = COALESCE(EXCLUDED.company_name, sm_tenants.company_name)
     RETURNING *`,
    [opts.smAccountUuid, opts.accessToken, opts.refreshToken ?? null, opts.expiresAt ?? null, opts.companyName ?? null]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// Seed standard glass products + operations for a new tenant
// ---------------------------------------------------------------------------
export async function seedTenantDefaults(tenantId: number) {
  const db = getPool();

  // Check already seeded
  const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM sm_products WHERE tenant_id = $1", [tenantId]);
  if (Number(rows[0]?.n) > 0) return;

  // Categories
  const cats = await db.query(
    `INSERT INTO sm_categories (tenant_id, name, sort_order) VALUES
     ($1, 'Sealed Units', 10),
     ($1, 'Single Glass', 20),
     ($1, 'Toughened Glass', 30),
     ($1, 'Laminated Glass', 40),
     ($1, 'Edge Work', 50),
     ($1, 'Georgian Bars', 60),
     ($1, 'Delivery', 70),
     ($1, 'Other', 80)
     RETURNING id, name`,
    [tenantId]
  );

  const catId = (name: string) => cats.rows.find((r: {id: number; name: string}) => r.name === name)?.id;

  // Products
  await db.query(
    `INSERT INTO sm_products (tenant_id, category_id, name, description, thickness, unit, sell_price, cost_price, sort_order) VALUES
     ($1, $2, '4-12-4 DGU Standard', 'Standard double glazed unit, aluminium spacer', '20mm unit', 'm2', 38.00, 18.00, 10),
     ($1, $2, '4-16-4 DGU Warm Edge', 'Double glazed unit with warm edge spacer bar', '24mm unit', 'm2', 48.50, 22.00, 20),
     ($1, $2, '4-12-4-12-4 TGU', 'Triple glazed unit, aluminium spacer', '32mm unit', 'm2', 72.00, 35.00, 30),
     ($1, $2, '4-16-4-16-4 TGU Warm Edge', 'Triple glazed unit, warm edge spacer', '40mm unit', 'm2', 89.00, 42.00, 40),
     ($1, $3, '4mm Float Clear', 'Standard 4mm float clear glass', '4mm', 'm2', 18.00, 8.00, 10),
     ($1, $3, '6mm Float Clear', 'Standard 6mm float clear glass', '6mm', 'm2', 22.00, 10.00, 20),
     ($1, $3, '4mm Obscure Std', 'Standard obscure patterned glass 4mm', '4mm', 'm2', 22.00, 10.00, 30),
     ($1, $3, '6mm Obscure Std', 'Standard obscure patterned glass 6mm', '6mm', 'm2', 28.00, 13.00, 40),
     ($1, $4, '4mm Toughened Clear', 'Heat-strengthened toughened safety glass', '4mm', 'm2', 42.00, 20.00, 10),
     ($1, $4, '6mm Toughened Clear', 'Toughened safety glass 6mm', '6mm', 'm2', 52.00, 24.00, 20),
     ($1, $4, '8mm Toughened Clear', 'Toughened safety glass 8mm', '8mm', 'm2', 68.00, 32.00, 30),
     ($1, $4, '10mm Toughened Clear', 'Toughened safety glass 10mm', '10mm', 'm2', 85.00, 40.00, 40),
     ($1, $5, '6.4mm Laminated Clear', '2x3mm panes with PVB interlayer', '6.4mm', 'm2', 58.00, 28.00, 10),
     ($1, $5, '8.8mm Laminated Clear', '2x4mm panes with PVB interlayer', '8.8mm', 'm2', 72.00, 35.00, 20)`,
    [tenantId, catId("Sealed Units"), catId("Single Glass"), catId("Toughened Glass"), catId("Laminated Glass")]
  );

  // Operations
  await db.query(
    `INSERT INTO sm_operations (tenant_id, category_id, name, description, unit, sell_price, cost_price, sort_order) VALUES
     ($1, $2, 'Polished edge', 'Machine polished bright edge finish', 'linear_m', 8.50, 4.00, 10),
     ($1, $2, 'Arrised edge', 'Smoothed safety arris', 'linear_m', 4.00, 2.00, 20),
     ($1, $2, 'Bevelled edge', 'Decorative bevelled edge', 'linear_m', 14.00, 7.00, 30),
     ($1, $2, 'Mitre cut', 'Corner mitre cut', 'item', 15.00, 7.50, 40),
     ($1, $2, 'Hole drilled', 'Machine drilled hole', 'item', 8.00, 3.50, 50),
     ($1, $3, '18mm Georgian bar', 'Aluminium Georgian bar 18mm', 'linear_m', 12.00, 5.50, 10),
     ($1, $3, '22mm Georgian bar', 'Aluminium Georgian bar 22mm', 'linear_m', 14.00, 6.50, 20),
     ($1, $3, '28mm Georgian bar', 'Aluminium Georgian bar 28mm', 'linear_m', 18.00, 8.00, 30),
     ($1, $4, 'Standard delivery', 'Standard delivery charge', 'item', 25.00, 12.00, 10),
     ($1, $4, 'Express delivery', 'Next day delivery charge', 'item', 45.00, 20.00, 20),
     ($1, $4, 'Fitting charge', 'Glass fitting labour', 'item', 65.00, 0.00, 30)`,
    [tenantId, catId("Edge Work"), catId("Georgian Bars"), catId("Delivery")]
  );
}
