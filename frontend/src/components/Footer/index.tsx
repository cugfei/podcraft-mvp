import * as React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} PodCraft. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="#"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              隐私政策
            </Link>
            <Link
              href="#"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              服务条款
            </Link>
            <Link
              href="#"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              联系我们
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
