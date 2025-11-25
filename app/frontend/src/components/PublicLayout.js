import React from 'react';
import { Outlet } from 'react-router-dom';

const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#1E1E1E]">
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;




