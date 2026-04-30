-- =============================================
-- CARDÁPIO DIGITAL - Schema inicial
-- =============================================

-- Extensões
create extension if not exists "uuid-ossp";

-- =============================================
-- RESTAURANTE
-- =============================================
create table restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  primary_color text not null default '#f97316',
  is_open boolean not null default true,
  operation_mode text not null default 'ambos' check (operation_mode in ('balcao', 'delivery', 'ambos')),
  whatsapp_number text,
  estimated_time_balcao integer not null default 20,
  estimated_time_delivery integer not null default 45,
  created_at timestamptz not null default now()
);

create table business_hours (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  open_time time not null default '08:00',
  close_time time not null default '22:00',
  is_closed boolean not null default false,
  unique(restaurant_id, day_of_week)
);

-- =============================================
-- CARDÁPIO
-- =============================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  base_price numeric(10,2) not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Grupos de variações (ex: "Tamanho", "Massa")
create table variation_groups (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  required boolean not null default false,
  min_selections integer not null default 0,
  max_selections integer not null default 1,
  sort_order integer not null default 0
);

-- Opções dentro de um grupo de variação
create table variations (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references variation_groups(id) on delete cascade,
  name text not null,
  price_modifier numeric(10,2) not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0
);

-- Grupos de adicionais (ex: "Adicionais", "Molhos")
create table addon_groups (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  required boolean not null default false,
  min_selections integer not null default 0,
  max_selections integer not null default 10,
  sort_order integer not null default 0
);

-- Adicionais individuais
create table addons (
  id uuid primary key default uuid_generate_v4(),
  addon_group_id uuid not null references addon_groups(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  is_available boolean not null default true,
  sort_order integer not null default 0
);

-- =============================================
-- ENTREGA
-- =============================================
create table delivery_zones (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  fee numeric(10,2) not null default 0,
  estimated_minutes integer not null default 45,
  is_active boolean not null default true
);

-- =============================================
-- PEDIDOS
-- =============================================
create sequence order_number_seq start 1;

create table orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_number integer not null default nextval('order_number_seq'),
  customer_name text not null,
  customer_phone text not null,
  type text not null default 'balcao' check (type in ('balcao', 'delivery')),
  status text not null default 'recebido' check (status in ('recebido', 'preparando', 'pronto', 'entregue', 'cancelado')),
  table_number text,
  address text,
  delivery_zone_id uuid references delivery_zones(id),
  delivery_fee numeric(10,2) not null default 0,
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  notes text
);

create table order_item_addons (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  addon_id uuid references addons(id),
  addon_name text not null,
  price numeric(10,2) not null default 0
);

create table order_item_variations (
  id uuid primary key default uuid_generate_v4(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  variation_id uuid references variations(id),
  variation_name text not null,
  group_name text not null,
  price_modifier numeric(10,2) not null default 0
);

-- =============================================
-- TRIGGER: updated_at automático
-- =============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- =============================================
-- RLS (Row Level Security)
-- =============================================
alter table restaurants enable row level security;
alter table business_hours enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table variation_groups enable row level security;
alter table variations enable row level security;
alter table addon_groups enable row level security;
alter table addons enable row level security;
alter table delivery_zones enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_addons enable row level security;
alter table order_item_variations enable row level security;

-- Leitura pública do cardápio
create policy "public_read_restaurants" on restaurants for select using (true);
create policy "public_read_business_hours" on business_hours for select using (true);
create policy "public_read_categories" on categories for select using (is_active = true);
create policy "public_read_products" on products for select using (true);
create policy "public_read_variation_groups" on variation_groups for select using (true);
create policy "public_read_variations" on variations for select using (true);
create policy "public_read_addon_groups" on addon_groups for select using (true);
create policy "public_read_addons" on addons for select using (true);
create policy "public_read_delivery_zones" on delivery_zones for select using (is_active = true);

-- Criação pública de pedidos
create policy "public_insert_orders" on orders for insert with check (true);
create policy "public_insert_order_items" on order_items for insert with check (true);
create policy "public_insert_order_item_addons" on order_item_addons for insert with check (true);
create policy "public_insert_order_item_variations" on order_item_variations for insert with check (true);

-- Leitura pública de pedidos (para acompanhamento)
create policy "public_read_orders" on orders for select using (true);
create policy "public_read_order_items" on order_items for select using (true);
create policy "public_read_order_item_addons" on order_item_addons for select using (true);
create policy "public_read_order_item_variations" on order_item_variations for select using (true);

-- Admin: acesso total (usuário autenticado)
create policy "admin_all_restaurants" on restaurants for all using (auth.role() = 'authenticated');
create policy "admin_all_categories" on categories for all using (auth.role() = 'authenticated');
create policy "admin_all_products" on products for all using (auth.role() = 'authenticated');
create policy "admin_all_variation_groups" on variation_groups for all using (auth.role() = 'authenticated');
create policy "admin_all_variations" on variations for all using (auth.role() = 'authenticated');
create policy "admin_all_addon_groups" on addon_groups for all using (auth.role() = 'authenticated');
create policy "admin_all_addons" on addons for all using (auth.role() = 'authenticated');
create policy "admin_all_delivery_zones" on delivery_zones for all using (auth.role() = 'authenticated');
create policy "admin_update_orders" on orders for update using (auth.role() = 'authenticated');
create policy "admin_all_business_hours" on business_hours for all using (auth.role() = 'authenticated');

-- =============================================
-- SEED: restaurante padrão
-- =============================================
insert into restaurants (name, primary_color, operation_mode, estimated_time_balcao, estimated_time_delivery)
values ('Meu Restaurante', '#f97316', 'ambos', 20, 45);

insert into business_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
select r.id, gs.day, '08:00', '22:00', gs.day = 0
from (select id from restaurants limit 1) r
cross join generate_series(0, 6) as gs(day);
