import { describe, expect, it } from 'vitest';
import { ALL_ON, hrefOn, hrefSections, sectionFallback, sectionsOn } from './sections';

const off = (k: keyof typeof ALL_ON) => ({ ...ALL_ON, homeLoan: true, [k]: false });

describe('site section links', () => {
  it('knows which switches a link needs', () => {
    expect(hrefSections('/buy')).toEqual(['buy']);
    expect(hrefSections('/rent?city=jaipur&propertyType=pg&pgGender=female').sort()).toEqual([
      'pg',
      'rent',
    ]);
    expect(hrefSections('/rent?propertyType=office')).toEqual(['rent', 'commercial']);
    expect(hrefSections('/projects/some-tower')).toEqual(['projects']);
    expect(hrefSections('/home-loan#calculators')).toEqual(['homeLoan']);
    expect(hrefSections('/agents')).toEqual([]);
    expect(hrefSections('https://example.com/buy')).toEqual([]);
  });

  it('hides links of switched-off sections only', () => {
    expect(hrefOn('/rent?propertyType=pg', off('pg'))).toBe(false);
    expect(hrefOn('/rent?propertyType=apartment', off('pg'))).toBe(true);
    expect(hrefOn('/buy?propertyType=plot', off('plot'))).toBe(false);
    expect(hrefOn('/commercial', off('commercial'))).toBe(false);
    expect(hrefOn('/home-loan', ALL_ON)).toBe(false);
    expect(hrefOn('/blog', off('buy'))).toBe(true);
  });

  it('sends off pages to the closest open page', () => {
    expect(sectionFallback('pg', ALL_ON)).toBe('/rent');
    expect(sectionFallback('pg', off('rent'))).toBe('/');
    expect(sectionFallback('plot', ALL_ON)).toBe('/buy');
    expect(sectionFallback('buy', ALL_ON)).toBe('/');
  });

  it('reads settings with every section on by default', () => {
    expect(sectionsOn(null)).toEqual(ALL_ON);
    expect(sectionsOn({ sections: { pg: false }, homeLoan: { enabled: true } })).toMatchObject({
      pg: false,
      rent: true,
      homeLoan: true,
    });
  });
});
