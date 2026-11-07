import Navbar from './Navbar';
import Sidebar from './Sidebar';

function MainLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;