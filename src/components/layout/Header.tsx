"use client"
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header: React.FC = () => {
  const pathname = usePathname();
  
  // Define as opções de menu
  const menuItems = [
    { name: 'Início', path: '/' },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-900 to-purple-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-4 sm:mb-0">
            <h1 className="text-2xl font-bold">
              <Link href="/">
                ROI Predictor
              </Link>
            </h1>
            <span className="ml-2 bg-blue-500 text-xs px-2 py-1 rounded-full">POKER</span>
          </div>
          
          <nav>
            <ul className="flex flex-wrap justify-center space-x-1 md:space-x-4">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link 
                    href={item.path} 
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                      ${pathname === item.path 
                        ? 'bg-white/20 text-white' 
                        : 'text-gray-100 hover:bg-white/10'
                      }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 