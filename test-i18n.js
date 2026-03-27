// Quick test for i18n system
import { i18n } from './core/i18n.js';

console.log('Testing i18n system...');

// Test getting UI texts
console.log('RU brand:', i18n.getUiText('brand'));
console.log('EN brand:', i18n.getUiText('brand', 'en'));
console.log('KK brand:', i18n.getUiText('brand', 'kk'));

// Test language switching
i18n.setLanguage('en');
console.log('After switching to EN, brand:', i18n.getUiText('brand'));

i18n.setLanguage('kk');
console.log('After switching to KK, brand:', i18n.getUiText('brand'));

// Test city content
const cities = i18n.getCityContent();
console.log('Cities loaded:', Object.keys(cities).length);

console.log('Test completed successfully!');