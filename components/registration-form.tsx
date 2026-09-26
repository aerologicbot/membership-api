"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Loader2, Send } from "lucide-react";
import { register, type RegistrationState } from "@/app/actions";
import {
  ACCENT,
  ActionButton,
  FieldLabel,
  SectionCard,
  SectionHeading,
  SelectInput,
  TextInput,
} from "@/components/cms-primitives";
import {
  CAPITAL_RANGES,
  EXPERIENCE_LEVELS,
  GENDERS,
  PACKAGES,
  REFERRAL_SOURCES,
  formatIdr,
  options,
} from "@/lib/catalog";

const initialState: RegistrationState = { status: "idle" };

function errorsFor(state: RegistrationState, field: string) {
  return state.status === "error" ? state.fieldErrors[field] : undefined;
}

function Field({
  name,
  label,
  hint,
  state,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  state: RegistrationState;
  children: (invalid: boolean) => React.ReactNode;
}) {
  const errors = errorsFor(state, name);
  return (
    <div>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children(Boolean(errors))}
      {errors ? (
        <span className="mt-1.5 block text-[11px] text-destructive">{errors[0]}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11px] text-muted-foreground/70">{hint}</span>
      ) : null}
    </div>
  );
}

function Choice({
  name,
  source,
  placeholder,
  invalid,
}: {
  name: string;
  source: Record<string, string>;
  placeholder: string;
  invalid: boolean;
}) {
  return (
    <SelectInput
      id={name}
      name={name}
      required
      defaultValue=""
      aria-invalid={invalid}
      className={invalid ? "border-destructive/50" : undefined}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options(source).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </SelectInput>
  );
}

export function RegistrationForm({ packageCode }: { packageCode: keyof typeof PACKAGES }) {
  const [state, formAction, pending] = useActionState(register, initialState);
  const pack = PACKAGES[packageCode];

  if (state.status === "success") return <Success startUrl={state.startUrl} />;

  return (
    <SectionCard className="p-0">
      <div className="p-6 pb-5">
        <SectionHeading
          title="Daftar membership"
          description="Isi data di bawah untuk membuat akun member. Akses grup Telegram dikirim sebagai link personal setelah pembayaran."
        />
      </div>

      <div className="border-t border-border/50 px-6 py-5">
        <div className="mb-5 flex items-end justify-between gap-4 rounded-xl border border-border/50 bg-muted/40 px-4 py-3">
          <span>
            <span className="mb-1 block text-[11px] text-muted-foreground/70">Paket</span>
            <b className="block text-[13px] font-medium text-foreground">{pack.label}</b>
          </span>
          <b className="text-2xl font-normal tabular-nums text-foreground">{formatIdr(pack.priceIdr)}</b>
        </div>

        <form action={formAction} noValidate className="flex flex-col gap-4">
          <input type="hidden" name="package" value={packageCode} />

          <Field name="full_name" label="Nama lengkap" state={state}>
            {(invalid) => (
              <TextInput
                id="full_name"
                name="full_name"
                type="text"
                required
                placeholder="Dimas Prayoga"
                autoComplete="name"
                aria-invalid={invalid}
                className={invalid ? "border-destructive/50" : undefined}
              />
            )}
          </Field>

          <Field name="email" label="Email" state={state}>
            {(invalid) => (
              <TextInput
                id="email"
                name="email"
                type="email"
                required
                placeholder="nama@email.com"
                autoComplete="email"
                aria-invalid={invalid}
                className={invalid ? "border-destructive/50" : undefined}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="whatsapp"
              label="No. WhatsApp"
              hint="Dipakai admin untuk menghubungi kamu."
              state={state}
            >
              {(invalid) => (
                <TextInput
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  required
                  placeholder="08123456789"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-invalid={invalid}
                  className={invalid ? "border-destructive/50" : undefined}
                />
              )}
            </Field>

            <Field
              name="telegram_username"
              label="Username Telegram"
              hint="Boleh pakai @ atau tidak."
              state={state}
            >
              {(invalid) => (
                <TextInput
                  id="telegram_username"
                  name="telegram_username"
                  type="text"
                  required
                  placeholder="@username"
                  autoComplete="off"
                  aria-invalid={invalid}
                  className={invalid ? "border-destructive/50" : undefined}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="gender" label="Jenis kelamin" state={state}>
              {(invalid) => <Choice name="gender" source={GENDERS} placeholder="Pilih" invalid={invalid} />}
            </Field>

            <Field name="experience_level" label="Pengalaman trading" state={state}>
              {(invalid) => (
                <Choice name="experience_level" source={EXPERIENCE_LEVELS} placeholder="Pilih" invalid={invalid} />
              )}
            </Field>
          </div>

          <Field name="capital_range" label="Range modal" state={state}>
            {(invalid) => (
              <Choice name="capital_range" source={CAPITAL_RANGES} placeholder="Pilih range modal" invalid={invalid} />
            )}
          </Field>

          <Field name="referral_source" label="Kamu tahu CAK dari mana?" state={state}>
            {(invalid) => (
              <Choice name="referral_source" source={REFERRAL_SOURCES} placeholder="Pilih salah satu" invalid={invalid} />
            )}
          </Field>

          {state.status === "error" && state.message ? (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
            >
              <AlertCircle className="size-3.5 shrink-0" />
              {state.message}
            </div>
          ) : null}

          <ActionButton type="submit" variant="primary" disabled={pending} className="mt-1 w-full">
            {pending && <Loader2 className="animate-spin" />}
            {pending ? "Memproses…" : "Lanjut ke pembayaran"}
          </ActionButton>
        </form>
      </div>

      <div className="border-t border-border/50 px-6 py-3.5 text-[11px] leading-relaxed text-muted-foreground">
        AeroLogic adalah decision-support tool, bukan bot auto-trading dan bukan jaminan profit. Keputusan trading
        tetap ada di kamu.
      </div>
    </SectionCard>
  );
}

function Success({ startUrl }: { startUrl: string | null }) {
  return (
    <SectionCard className="p-0">
      <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
        <span
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "#FEF3E9", color: "#B85302" }}
        >
          <Check className="size-6" strokeWidth={2.5} />
        </span>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          {startUrl ? "Pendaftaran berhasil" : "Data kamu tersimpan"}
        </h2>
        <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-muted-foreground">
          {startUrl
            ? "Link di bawah khusus untuk akun Telegram kamu dan hanya bisa dipakai sekali. Jangan dibagikan ke siapa pun."
            : "Langkah berikutnya pembayaran. Setelah dikonfirmasi, link menuju Bot AeroLogic dikirim ke email kamu."}
        </p>
      </div>

      {startUrl ? (
        <div className="border-t border-border/50 px-6 py-5">
          <div className="mb-3 break-all rounded-lg border border-border/50 bg-muted/40 px-3.5 py-3 font-mono text-[11px] text-foreground/80">
            {startUrl}
          </div>
          <a
            href={startUrl}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: ACCENT }}
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            Buka Bot AeroLogic
          </a>
        </div>
      ) : null}

      <ol className="flex flex-col gap-3 border-t border-border/50 px-6 py-5">
        {(startUrl
          ? [
              "Buka link di atas — Telegram terbuka di chat Bot AeroLogic.",
              "Tekan tombol Start.",
              "Bot mengirim undangan grup VIP yang berlaku 15 menit.",
            ]
          : [
              "Selesaikan pembayaran.",
              "Terima link personal menuju Bot AeroLogic.",
              "Tekan Start di bot, lalu masuk grup VIP lewat undangan yang dikirim bot.",
            ]
        ).map((step, index) => (
          <li key={step} className="flex items-start gap-3 text-[12px] leading-relaxed text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground/80">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
