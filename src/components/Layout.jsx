import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

// 共用版型：導覽列 + 頁面內容（各頁自帶 <main>）+ 頁尾
export default function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  );
}
