import React from 'react';
import { useParams } from 'react-router-dom';

const CariDetail = () => {
  const { id } = useParams();
  return (
    <div className="space-y-6" data-testid="cari-detail-page">
      <h1 className="text-3xl font-bold text-white">Cari Detay</h1>
      <p className="text-gray-400">Cari ID: {id} - Detaylı görünüm geliştirilecek</p>
    </div>
  );
};

export default CariDetail;
