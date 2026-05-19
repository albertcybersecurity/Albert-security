exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    console.log(`Webhook MP → type: ${body.type} | id: ${body.data?.id}`);
  } catch(err) { console.error('Webhook error:', err); }
  return { statusCode: 200, body: 'OK' };
};
