import type { Row } from './types';

// Synthetic sample datasets for the live demo (generated with a fixed seed, not real businesses).

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  headers: string[];
  rows: Row[];
}

export function salesSample(): SampleDataset {
  const r = rng(42);
  const pick = <T,>(xs: T[], w?: number[]) => {
    if (!w) return xs[Math.floor(r() * xs.length)];
    let x = r() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < xs.length; i++) if ((x -= w[i]) < 0) return xs[i];
    return xs[xs.length - 1];
  };
  const products = [
    { name: 'Website Starter', price: 900 },
    { name: 'Business Website', price: 2400 },
    { name: 'E-commerce Store', price: 4200 },
    { name: 'Mobile App MVP', price: 7800 },
    { name: 'AI Chatbot', price: 1500 },
    { name: 'Automation Setup', price: 1100 },
    { name: 'Brand Identity', price: 1300 },
    { name: 'Video Package', price: 650 },
  ];
  const regions = ['North America', 'Europe', 'Middle East', 'Asia Pacific'];
  const channels = ['Referral', 'LinkedIn', 'Google Ads', 'Website', 'Email'];
  const rows: Row[] = [];
  for (let i = 0; i < 480; i++) {
    const month = Math.floor((i / 480) * 12);
    const day = 1 + Math.floor(r() * 27);
    const p = pick(products, [18, 16, 9, 4, 14, 13, 12, 14]);
    // gentle growth through the year
    const units = 1 + Math.floor(r() * (p.price > 3000 ? 1.4 : 3.2));
    const discount = r() < 0.2 ? 0.1 : 0;
    const revenue = Math.round(p.price * units * (1 - discount) * (0.92 + month * 0.012 + r() * 0.1));
    rows.push({
      'Order ID': `ORD-${String(1001 + i)}`,
      'Order Date': `2025-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      Region: pick(regions, [38, 30, 14, 18]),
      Channel: pick(channels, [26, 24, 18, 20, 12]),
      Product: p.name,
      'Customer Type': r() < 0.35 ? 'Returning' : 'New',
      Units: String(units),
      Revenue: `$${revenue.toLocaleString('en-US')}`,
      Discount: discount ? '10%' : '0%',
    });
  }
  return {
    id: 'sales',
    name: 'agency-sales-2025.csv',
    description: '480 orders for a digital agency: products, regions, channels and revenue (synthetic).',
    headers: Object.keys(rows[0]),
    rows,
  };
}

export function marketingSample(): SampleDataset {
  const r = rng(7);
  const sources = ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'SEO', 'Email', 'Referral'];
  const cpl: Record<string, number> = { 'Google Ads': 38, 'Meta Ads': 22, 'LinkedIn Ads': 64, SEO: 9, Email: 5, Referral: 0 };
  const conv: Record<string, number> = { 'Google Ads': 0.11, 'Meta Ads': 0.06, 'LinkedIn Ads': 0.14, SEO: 0.09, Email: 0.12, Referral: 0.27 };
  const rows: Row[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  months.forEach((m, mi) => {
    for (const s of sources) {
      const leads = Math.round((s === 'Referral' ? 14 : 40) * (0.8 + r() * 0.5) * (1 + mi * 0.03));
      const cost = Math.round(leads * cpl[s] * (0.85 + r() * 0.3));
      const conversions = Math.round(leads * conv[s] * (0.8 + r() * 0.4));
      rows.push({ Month: `${m} 2025`, Source: s, Leads: String(leads), Cost: `$${cost.toLocaleString('en-US')}`, Conversions: String(conversions), 'Deal Value': `$${(conversions * Math.round(1800 + r() * 900)).toLocaleString('en-US')}` });
    }
  });
  return {
    id: 'marketing',
    name: 'marketing-leads-2025.csv',
    description: 'Monthly leads, ad cost and conversions by acquisition source (synthetic).',
    headers: Object.keys(rows[0]),
    rows,
  };
}

export const SAMPLES = [salesSample, marketingSample];
