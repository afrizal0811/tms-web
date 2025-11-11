'use client';

import { toastError } from '@/lib/toastHelper';
import { useEffect, useState } from 'react';
export default function UserDisplay() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Membaca localStorage hanya di sisi client setelah komponen dimuat
    try {
      const userStr = localStorage.getItem('selectedUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        //eslint-disable-next-line
        setUserName(user.name);
      }
    } catch (e) {
      toastError('Gagal memuat data user');
    }
  }, []); // Array dependensi kosong berarti ini hanya berjalan sekali

  // Jangan render apa-apa jika tidak ada nama user
  if (!userName) {
    return null;
  }

  // Tampilkan nama user (style disamakan dengan NavLink)
  return <span className="text-sm font-medium text-slate-700">{userName}</span>;
}
