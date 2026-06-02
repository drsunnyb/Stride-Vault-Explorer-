-- =====================================================================
-- Stride Quest — Fix player_share_code (round 3 — FINAL hopefully).
--
-- The subtlety: JS `((h<<5)+h)` ONLY int32-coerces the LEFT side of `<<`.
-- The `+h` immediately after uses the ORIGINAL uncoerced h. So:
--   h_next = (ToInt32(h) << 5) + h + charCode
-- ...not the (i32 + i32) I had before.
--
-- Verified test vectors (matches browser JS exactly):
--   'a'                            → 3t3a
--   'hi'                           → 3ho9i
--   'sandeep@officiallyinvested.com' → 2uzbgc
--   'hermes-livetest+verify@stridequest.dev' → qfxucw
-- =====================================================================

begin;

create or replace function public.player_share_code(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_email text   := lower(trim(p_email));
  v_h     bigint := 5381;
  v_i32   bigint;            -- h coerced to int32, ONLY for the shift step
  v_shift bigint;            -- (i32 << 5) result, int32
  v_i     int;
  v_b36   text;
  v_mask  constant bigint := 4294967295;     -- 2^32 - 1
  v_sign  constant bigint := 2147483648;     -- 2^31
  v_neg   constant bigint := 4294967296;     -- 2^32
begin
  for v_i in 1..length(v_email) loop
    -- ToInt32(h)
    v_i32 := v_h & v_mask;
    if v_i32 >= v_sign then v_i32 := v_i32 - v_neg; end if;

    -- (i32 << 5) coerced to int32
    v_shift := (v_i32 * 32) & v_mask;
    if v_shift >= v_sign then v_shift := v_shift - v_neg; end if;

    -- h_next = shifted + ORIGINAL h + charCode (plain JS Number math)
    v_h := v_shift + v_h + ascii(substr(v_email, v_i, 1));
  end loop;

  -- JS Math.abs
  v_h := abs(v_h);

  -- base36 lowercase, first 6
  declare
    v_chars text   := '0123456789abcdefghijklmnopqrstuvwxyz';
    v_out   text   := '';
    v_n     bigint := v_h;
  begin
    if v_n = 0 then return '000000'; end if;
    while v_n > 0 loop
      v_out := substr(v_chars, (v_n % 36)::int + 1, 1) || v_out;
      v_n := v_n / 36;
    end loop;
    v_b36 := v_out;
  end;

  return substr(v_b36, 1, 6);
end;
$$;

-- Backfill again with the correct codes
update public.profiles
   set referral_code = public.player_share_code(email)
 where email is not null;

commit;
