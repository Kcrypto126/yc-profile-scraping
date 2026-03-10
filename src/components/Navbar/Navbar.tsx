"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();

  return (
    <nav className="w-full bg-gray-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-xl font-bold">
          <Link href="/search">
            <Image
              src="/cutestar.png"
              alt="Logo"
              width={100}
              height={100}
              className="h-10 w-10 rounded-full"
            />
          </Link>
        </div>

        <div className="flex space-x-8">
          <Link href="/search">
            <button className="text-white hover:text-gray-300">
              Dashboard
            </button>
          </Link>
          <Link href="/scrape">
            <button className="text-white hover:text-gray-300">Scrape</button>
          </Link>
          <Link href="/overview">
            <button className="text-white hover:text-gray-300">Overview</button>
          </Link>
          <Link href="/about">
            <button className="text-white hover:text-gray-300">About</button>
          </Link>
          {!isLoading && isAuthenticated && user?.role === "admin" && (
            <Link href="/admin">
              <button className="text-white hover:text-gray-300">Admin</button>
            </Link>
          )}
          {!isLoading && isAuthenticated && (
            <Link href="/manageaccount">
              <button className="text-white hover:text-gray-300">Manage Account</button>
            </Link>
          )}
          {!isLoading && !isAuthenticated && (
            <Link href="/signup">
              <button className="text-white hover:text-gray-300">Sign up</button>
            </Link>
          )}
          {!isLoading && !isAuthenticated && (
            <Link href="/signin">
              <button className="text-white hover:text-gray-300">Sign in</button>
            </Link>
          )}
          {!isLoading && isAuthenticated && (
            <button onClick={signOut} className="text-white hover:text-gray-300">
              Sign out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
