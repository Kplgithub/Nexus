import { describe, expect, it } from 'vitest';
import { ipv4ToInt, placeAt, placeIndexForIp, siteCityForPlace } from './geo';

const cities = [
  { slug: 'jaipur', name: 'Jaipur', state: 'Rajasthan' },
  { slug: 'udaipur', name: 'Udaipur', state: 'Rajasthan' },
];
const cityFor = (ip: string) => {
  const i = placeIndexForIp(ip);
  return i === null ? null : siteCityForPlace(i, cities);
};

describe('geo lookup', () => {
  it('parses IPv4 and IPv4-mapped IPv6 only', () => {
    expect(ipv4ToInt('1.2.3.4')).toBe(16909060);
    expect(ipv4ToInt('::ffff:1.2.3.4')).toBe(16909060);
    expect(ipv4ToInt('256.1.1.1')).toBeNull();
    expect(ipv4ToInt('2401:4900::1')).toBeNull();
    expect(ipv4ToInt('')).toBeNull();
  });

  it('maps Indian IPs to the site city, including suburbs', () => {
    expect(cityFor('1.23.117.10')).toBe('jaipur');
    expect(cityFor('1.39.239.10')).toBe('udaipur');
    expect(placeAt(placeIndexForIp('182.76.32.10')!)?.name).toMatch(/Sanganer/);
    expect(cityFor('182.76.32.10')).toBe('jaipur');
  });

  it('knows Indian cities the site does not serve yet', () => {
    const i = placeIndexForIp('1.23.251.10');
    expect(placeAt(i!)?.name).toBe('Mumbai');
    expect(siteCityForPlace(i!, cities)).toBeNull();
    expect(siteCityForPlace(i!, [...cities, { slug: 'mumbai', name: 'Mumbai' }])).toBe('mumbai');
  });

  it('returns nothing outside India or for private addresses', () => {
    expect(placeIndexForIp('8.8.8.8')).toBeNull();
    expect(placeIndexForIp('127.0.0.1')).toBeNull();
    expect(placeIndexForIp('10.0.0.1')).toBeNull();
  });
});
