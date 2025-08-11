import { Link, useLocation } from "wouter";

export default function MobileNavigation() {
  const [location] = useLocation();
  
  // Check if link is active
  const isActiveLink = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Bottom Navigation for Mobile */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-10">
        <div className="grid grid-cols-4 h-16">
          <Link href="/">
            <a className={`flex flex-col items-center justify-center ${isActiveLink("/") ? "text-primary" : "text-gray-500"}`}>
              <span className="material-icons text-xl">home</span>
              <span className="text-xs mt-1">Home</span>
            </a>
          </Link>
          
          <Link href="/medications">
            <a className={`flex flex-col items-center justify-center ${isActiveLink("/medications") ? "text-primary" : "text-gray-500"}`}>
              <span className="material-icons text-xl">medication</span>
              <span className="text-xs mt-1">Meds</span>
            </a>
          </Link>
          
          <Link href="/orders">
            <a className={`flex flex-col items-center justify-center ${isActiveLink("/orders") ? "text-primary" : "text-gray-500"}`}>
              <span className="material-icons text-xl">local_shipping</span>
              <span className="text-xs mt-1">Orders</span>
            </a>
          </Link>
          
          <Link href="/reminders">
            <a className={`flex flex-col items-center justify-center ${isActiveLink("/reminders") ? "text-primary" : "text-gray-500"}`}>
              <span className="material-icons text-xl">notifications</span>
              <span className="text-xs mt-1">Alerts</span>
            </a>
          </Link>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="sm:hidden fixed right-4 bottom-20 z-20">
        <Link href="/scan">
          <a className="h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center">
            <span className="material-icons">add_a_photo</span>
          </a>
        </Link>
      </div>
    </>
  );
}
