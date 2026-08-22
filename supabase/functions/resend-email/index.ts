import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_ADDRESS = "Verify <onboarding@resend.dev>";

function esc(s: string): string {
  if (!s) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tplVerificationRequest(firstName: string, commerceName: string, url: string, code: string): string {
  const p: string[] = [];
  p.push('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>');
  p.push('<body style="margin:0;padding:0;background:#F3F4F6;font-family:Work Sans,sans-serif">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px"><tr><td align="center">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">');
  p.push('<tr><td style="background:linear-gradient(135deg,#DC2626,#B91C1C);padding:40px 20px;text-align:center">');
  p.push('<h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0">Verify</h1></td></tr>');
  p.push('<tr><td style="padding:32px 24px">');
  p.push('<h2 style="color:#1F2937;font-size:20px;font-weight:700;margin:0 0 16px;text-align:center">Si compraste en ' + esc(commerceName) + '</h2>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center">necesitamos que autorices tu compra para evitar que la rechacemos!</p>');
  p.push('<div style="background:#FEE2E2;padding:16px;border-radius:8px;margin-bottom:24px"><p style="color:#991B1B;font-size:14px;margin:0;text-align:center"><strong>Tenes 24 horas para validar tus datos</strong><br>Si no tenemos respuesta la compra sera rechazada automaticamente.</p></div>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center">Autorizar tu compra sera muy facil! Solo segui estos sencillos pasos.</p>');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px"><tr>');
  p.push('<td width="33%" align="center" style="padding:12px 0"><div style="width:40px;height:40px;background:#DC2626;border-radius:50%;margin:0 auto 8px;line-height:40px;text-align:center"><span style="color:#FFF;font-weight:700;font-size:16px">1</span></div><p style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;margin:0">Ingresa al boton</p></td>');
  p.push('<td width="33%" align="center" style="padding:12px 0"><div style="width:40px;height:40px;background:#DC2626;border-radius:50%;margin:0 auto 8px;line-height:40px;text-align:center"><span style="color:#FFF;font-weight:700;font-size:16px">2</span></div><p style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;margin:0">Carga tu info</p></td>');
  p.push('<td width="33%" align="center" style="padding:12px 0"><div style="width:40px;height:40px;background:#10B981;border-radius:50%;margin:0 auto 8px;line-height:40px;text-align:center"><span style="color:#FFF;font-weight:700;font-size:16px">3</span></div><p style="color:#6B7280;font-size:11px;font-weight:600;text-transform:uppercase;margin:0">Ya esta listo</p></td>');
  p.push('</tr></table>');
  p.push('<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">');
  p.push('<a href="' + url + '" style="display:inline-block;background:#DC2626;color:#FFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:9999px">Autoriza tu Compra</a>');
  p.push('</td></tr></table>');
  p.push('<p style="color:#9CA3AF;font-size:12px;text-align:center;margin:24px 0 0">Codigo: #' + esc(code) + '</p>');
  p.push('</td></tr><tr><td style="background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB">');
  p.push('<p style="color:#9CA3AF;font-size:12px;margin:0">Este es un email automatico, no respondas a este mensaje.</p>');
  p.push('</td></tr></table></td></tr></table></body></html>');
  return p.join('');
}

function tplOperatorNotification(firstName: string, code: string, url: string, commerceName: string): string {
  const p: string[] = [];
  p.push('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>');
  p.push('<body style="margin:0;padding:0;background:#F3F4F6;font-family:Work Sans,sans-serif">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px"><tr><td align="center">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">');
  p.push('<tr><td style="background:linear-gradient(135deg,#2563EB,#1D4ED8);padding:40px 20px;text-align:center">');
  p.push('<h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0">Verify - Panel Admin</h1></td></tr>');
  p.push('<tr><td style="padding:32px 24px">');
  p.push('<h2 style="color:#1F2937;font-size:20px;font-weight:700;margin:0 0 16px;text-align:center">Nuevo envio de documentos</h2>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center">El cliente <strong>' + esc(firstName) + '</strong> completo la carga de sus documentos.</p>');
  p.push('<div style="background:#EFF6FF;padding:16px;border-radius:8px;margin-bottom:24px"><p style="color:#1E40AF;font-size:14px;margin:0;text-align:center"><strong>Codigo: #' + esc(code) + '</strong></p></div>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px;text-align:center">Ingresa al panel de administracion para revisar los documentos.</p>');
  p.push('<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">');
  p.push('<a href="' + url + '" style="display:inline-block;background:#2563EB;color:#FFF;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:9999px">Verificar Documentos</a>');
  p.push('</td></tr></table>');
  p.push('</td></tr><tr><td style="background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB">');
  p.push('<p style="color:#9CA3AF;font-size:12px;margin:0">Email automatico de ' + esc(commerceName) + '.</p>');
  p.push('</td></tr></table></td></tr></table></body></html>');
  return p.join('');
}

function tplApproved(firstName: string, commerceName: string, code: string): string {
  const p: string[] = [];
  p.push('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>');
  p.push('<body style="margin:0;padding:0;background:#F3F4F6;font-family:Work Sans,sans-serif">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px"><tr><td align="center">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">');
  p.push('<tr><td style="background:linear-gradient(135deg,#10B981,#059669);padding:40px 20px;text-align:center">');
  p.push('<h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0">Verify</h1></td></tr>');
  p.push('<tr><td style="padding:40px 24px;text-align:center">');
  p.push('<h2 style="color:#1F2937;font-size:22px;font-weight:700;margin:0 0 16px">Compra Aprobada!</h2>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px">Hola <strong>' + esc(firstName) + '</strong>,</p>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px">Tu compra ha sido verificada y aprobada exitosamente. El comercio ' + esc(commerceName) + ' ha confirmado tu pedido.</p>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px">Codigo: <strong>#' + esc(code) + '</strong></p>');
  p.push('<div style="background:#ECFDF5;padding:16px;border-radius:8px"><p style="color:#065F46;font-size:14px;margin:0">Tu compra esta en proceso. Pronto recibiras mas informacion sobre el envio.</p></div>');
  p.push('</td></tr><tr><td style="background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB">');
  p.push('<p style="color:#9CA3AF;font-size:12px;margin:0">Este es un email automatico, no respondas a este mensaje.</p>');
  p.push('</td></tr></table></td></tr></table></body></html>');
  return p.join('');
}

function tplRejected(firstName: string, commerceName: string, code: string): string {
  const p: string[] = [];
  p.push('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>');
  p.push('<body style="margin:0;padding:0;background:#F3F4F6;font-family:Work Sans,sans-serif">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 20px"><tr><td align="center">');
  p.push('<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)">');
  p.push('<tr><td style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:40px 20px;text-align:center">');
  p.push('<h1 style="color:#FFF;font-size:24px;font-weight:700;margin:0">Verify</h1></td></tr>');
  p.push('<tr><td style="padding:40px 24px;text-align:center">');
  p.push('<h2 style="color:#1F2937;font-size:22px;font-weight:700;margin:0 0 16px">Compra Rechazada</h2>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px">Hola <strong>' + esc(firstName) + '</strong>,</p>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px">Lamentablemente no pudimos verificar tu identidad. Tu compra en ' + esc(commerceName) + ' ha sido rechazada.</p>');
  p.push('<p style="color:#4B5563;font-size:16px;line-height:1.6;margin:0 0 24px">Codigo: <strong>#' + esc(code) + '</strong></p>');
  p.push('<div style="background:#FEF2F2;padding:16px;border-radius:8px"><p style="color:#991B1B;font-size:14px;margin:0">Si crees que esto es un error, contacta al soporte del comercio.</p></div>');
  p.push('</td></tr><tr><td style="background:#F9FAFB;padding:24px;text-align:center;border-top:1px solid #E5E7EB">');
  p.push('<p style="color:#9CA3AF;font-size:12px;margin:0">Este es un email automatico, no respondas a este mensaje.</p>');
  p.push('</td></tr></table></td></tr></table></body></html>');
  return p.join('');
}

const TEMPLATES: Record<string, Function> = {
  verification_request: tplVerificationRequest,
  operator_notification: tplOperatorNotification,
  status_approved: tplApproved,
  status_rejected: tplRejected,
};

const SUBJECTS: Record<string, string> = {
  verification_request: "Verifica tu compra",
  operator_notification: "Nuevo envio de documentos - Verify",
  status_approved: "Tu compra ha sido aprobada!",
  status_rejected: "Tu compra ha sido rechazada",
};

serve(async (req) => {
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
    const body = await req.json();
    const { type, to, firstName, verificationUrl, uniqueCode, commerceName } = body;

    if (!type || !to || !firstName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, to, firstName" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const tplFn = TEMPLATES[type];
    if (!tplFn) {
      return new Response(
        JSON.stringify({ error: "Invalid type" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    let html: string;
    if (type === "verification_request") {
      html = tplFn(firstName, commerceName || "Verify", verificationUrl || "", uniqueCode || "");
    } else if (type === "operator_notification") {
      html = tplFn(firstName, uniqueCode || "", verificationUrl || "", commerceName || "Verify");
    } else {
      html = tplFn(firstName, commerceName || "Verify", uniqueCode || "");
    }

    const subject = SUBJECTS[type] || "Verify";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Email sent", id: data.id }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
