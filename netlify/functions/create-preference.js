const https = require('https');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalido' }) }; }
  const { name, service, amount, currency, notes } = body;
  if (!name || !service || !amount || parseFloat(amount) <= 0) return { statusCode: 400, body: JSON.stringify({ error: 'Datos incompletos.' }) };
  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  const WA_NUMBER = process.env.WA_NUMBER || '5491125153541';
  const BASE_URL = process.env.BASE_URL || 'https://albertsecuritydigital.com';
  const preference = {
    items: [{ title: service, description: notes ? `${notes} — Cliente: ${name}` : `Servicio para ${name}`, quantity: 1, unit_price: parseFloat(amount), currency_id: currency === 'USD' ? 'USD' : 'ARS' }],
    payer: { name },
    back_urls: { success: `${BASE_URL}/?payment=success`, failure: `${BASE_URL}/?payment=failure`, pending: `${BASE_URL}/?payment=pending` },
    auto_return: 'approved',
    statement_descriptor: 'ALBERT SECURITY',
    external_reference: `${name.replace(/\s+/g,'_')}-${Date.now()}`
  };
  const mpResponse = await new Promise((resolve, reject) => {
    const postData = JSON.stringify(preference);
    const req = https.request({ hostname: 'api.mercadopago.com', path: '/checkout/preferences', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Length': Buffer.byteLength(postData) } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
  let mpData;
  try { mpData = JSON.parse(mpResponse.body); } catch { return { statusCode: 500, body: JSON.stringify({ error: 'Respuesta invalida de MP' }) }; }
  if (!mpData.init_point) return { statusCode: 500, body: JSON.stringify({ error: mpData.message || 'No se pudo crear la preferencia.' }) };
  const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
  const waMsg = encodeURIComponent(`🔔 *NUEVO PAGO — Albert Security*\n\n👤 Cliente: ${name}\n📦 Servicio: ${service}\n💰 Monto: ${amount} ${currency}\n📅 Fecha: ${fecha}\n📝 Notas: ${notes || 'Sin notas'}\n\n✅ Cliente en Checkout Pro de Mercado Pago.`);
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id, whatsapp_link: `https://wa.me/${WA_NUMBER}?text=${waMsg}` }) };
};
