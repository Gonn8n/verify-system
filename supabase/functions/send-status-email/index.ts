// ============================================
// VERIFY SYSTEM - Edge Function: Send Status Email
// ============================================
// Deploy: supabase functions deploy send-status-email
// Env vars needed: RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Email templates inline (para no depender de archivos)
const templates = {
  approved: (firstName, commerceName, uniqueCode) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Work Sans',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
<tr><td style="background:linear-gradient(135deg,#10B981,#059669);padding:40px 20px;text-align:center;">
<div style="width:84px;height:84px;background:#FFF;border-radius:20px;margin:0 auto 16px;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;"><div style="width:68px;height:68px;background:linear-gradient(135deg,#10B981,#047857);border-radius:16px;display:flex;align-items:center;justify-content:center;"><span style="color:#FFF;font-size:34px;font-weight:700;line-height:1;">✓</span></div></div>
<h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0;">Verify</h1>
</td></tr>
<tr><td style="padding:40px 24px;text-align:center;">
<div style="width:80px;height:80px;background:#D1FAE5;border-radius:50%;margin:0 auto 24px;"><span style="font-size:40px;line-height:80px;">✓</span></div>
<h2 style="color:#1F2937;font-size:22px;font-weight:700;margin:0 0 16px;">¡Compra Aprobada!</h2>
<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Hola <strong>${firstName}</strong>,</p>
<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Tu compra ha sido verificada y aprobada exitosamente. El comercio ${commerceName} ha confirmado tu pedido.</p>
<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Código de operación: <strong>#${uniqueCode}</strong></p>
<div style="background:#ECFDF5;padding:16px;border-radius:8px;"><p style="color:#065F46;font-size:14px;margin:0;">Tu compra está en proceso. Pronto recibirás más información sobre el envío.</p></div>
</td></tr>
<tr><td style="background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB;"><p style="color:#9CA3AF;font-size:12px;margin:0;">Este es un email automático, no respondas a este mensaje.</p></td></tr>
</table></td></tr></table>
</body></html>`,

  rejected: (firstName, commerceName, uniqueCode) => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Work Sans',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);">
<tr><td style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:40px 20px;text-align:center;">
<div style="width:84px;height:84px;background:#FFF;border-radius:20px;margin:0 auto 16px;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;"><div style="width:68px;height:68px;background:linear-gradient(135deg,#DC2626,#991B1B);border-radius:16px;display:flex;align-items:center;justify-content:center;"><span style="color:#FFF;font-size:34px;font-weight:700;line-height:1;">✓</span></div></div>
<h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0;">Verify</h1>
</td></tr>
<tr><td style="padding:40px 24px;text-align:center;">
<div style="width:80px;height:80px;background:#FEE2E2;border-radius:50%;margin:0 auto 24px;"><span style="font-size:40px;line-height:80px;">✗</span></div>
<h2 style="color:#1F2937;font-size:22px;font-weight:700;margin:0 0 16px;">Compra Rechazada</h2>
<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Hola <strong>${firstName}</strong>,</p>
<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Lamentablemente no pudimos verificar tu identidad. Tu compra en ${commerceName} ha sido rechazada.</p>
<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;">Código de operación: <strong>#${uniqueCode}</strong></p>
<div style="background:#FEF2F2;padding:16px;border-radius:8px;"><p style="color:#991B1B;font-size:14px;margin:0;">Si creés que esto es un error, por favor contactá al soporte del comercio.</p></div>
</td></tr>
<tr><td style="background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB;"><p style="color:#9CA3AF;font-size:12px;margin:0;">Este es un email automático, no respondas a este mensaje.</p></td></tr>
</table></td></tr></table>
</body></html>`
};

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { email, firstName, status, commerceName, uniqueCode } = await req.json();

    if (!email || !firstName || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // No enviar email para otros estados
    if (status !== "approved" && status !== "rejected") {
      return new Response(
        JSON.stringify({ message: "Email not sent for this status" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Seleccionar template
    const html = templates[status](firstName, commerceName || "Verify", uniqueCode || "");

    // Enviar con Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${commerceName || "Verify"} <onboarding@resend.dev>`,
        to: [email],
        subject: status === "approved" ? "¡Tu compra ha sido aprobada!" : "Tu compra ha sido rechazada",
        html: html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Email sent successfully", id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
