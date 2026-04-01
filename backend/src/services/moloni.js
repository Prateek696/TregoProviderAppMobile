const axios = require('axios');

const MOLONI_BASE = 'https://api.moloni.pt/v1';

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.MOLONI_CLIENT_ID,
    client_secret: process.env.MOLONI_CLIENT_SECRET,
    username: process.env.MOLONI_USERNAME,
    password: process.env.MOLONI_PASSWORD,
  });

  const res = await axios.post(`${MOLONI_BASE}/grant/`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  accessToken = res.data.access_token;
  // Moloni tokens expire in 3600s — refresh 5 min early
  tokenExpiry = Date.now() + (res.data.expires_in - 300) * 1000;
  return accessToken;
}

async function moloniRequest(method, endpoint, data = null) {
  const token = await getAccessToken();
  const url = `${MOLONI_BASE}${endpoint}/?access_token=${token}`;

  const res = await axios({ method, url, data });
  return res.data;
}

// Create a Moloni invoice from a job record
// job must have: service/title, price, client_name, client_nif, client_email, scheduled_at
async function createInvoice(job, provider) {
  if (!job.client_nif) {
    throw new Error('Client NIF is required to create a Moloni invoice');
  }

  // Get or create the client in Moloni
  const companyId = process.env.MOLONI_COMPANY_ID;

  // Search for existing customer by NIF
  const customers = await moloniRequest('GET', `/customers/getBySearch/`, null);
  let customerId = null;

  // Find customer matching the NIF
  const existing = (customers || []).find((c) => c.vat === job.client_nif);
  if (existing) {
    customerId = existing.customer_id;
  } else {
    // Create the customer
    const newCustomer = await moloniRequest('POST', `/customers/insert/`, {
      company_id: companyId,
      vat: job.client_nif,
      name: job.client_name || 'Cliente',
      email: job.client_email || '',
      language_id: 1, // Portuguese
      payment_method_id: 0,
      maturity_date_id: 0,
    });
    customerId = newCustomer.customer_id;
  }

  const price = parseFloat(job.actual_price || job.price || 0);
  const vatRate = 23; // Standard Portuguese VAT
  const netPrice = parseFloat((price / (1 + vatRate / 100)).toFixed(2));

  const invoiceData = {
    company_id: companyId,
    date: new Date().toISOString().split('T')[0],
    expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    customer_id: customerId,
    your_reference: job.id,
    notes: job.notes || '',
    products: [
      {
        product_id: 0, // 0 = use description directly
        name: job.title || job.service || 'Serviço',
        qty: 1,
        price: netPrice,
        discount: 0,
        order: 1,
        unit_id: 0,
        tax_id: vatRate,
        exemption_reason: '',
      },
    ],
    send_email: job.client_email ? 1 : 0,
  };

  const result = await moloniRequest('POST', `/invoices/insert/`, invoiceData);

  return {
    id: result.document_id?.toString() || null,
    number: result.document_set_id ? `${result.document_set_id}/${result.number}` : null,
    total: price,
    pdf_url: result.pdf_link || null,
  };
}

module.exports = { createInvoice };
