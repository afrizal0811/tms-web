import { startTopic } from "./start";

export const driverTopics = [
  ...startTopic,
  {
    id: 'driver-app',
    category: 'driver',
    title: 'Aplikasi Driver',
    blocks: [{ type: 'text', content: '<p>Panduan penggunaan aplikasi mobile untuk driver.</p>' }],
    subTopics: [
      {
        id: 'driver-login',
        title: 'Login & Absensi',
        blocks: [{ type: 'text', content: '<p>Cara melakukan login dan absensi harian.</p>' }],
      },
      {
        id: 'driver-pod',
        title: 'Upload Bukti Kirim (POD)',
        blocks: [
          {
            type: 'text',
            content: '<p>Pastikan foto bukti kirim terlihat jelas dan tidak buram.</p>',
          },
          { type: 'image', src: '/images/good-pod-example.jpg', alt: 'Contoh POD Bagus' },
        ],
      },
    ],
  },
];
