import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXUS Estate | Rentals | Properties',
    short_name: 'NEXUS Estate',
    start_url: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#9D174D',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
