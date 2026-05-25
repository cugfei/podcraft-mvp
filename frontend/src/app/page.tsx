import * as React from "react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          PodCraft
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          AI驱动的播客创作与管理平台
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/create"
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            开始创作
          </a>
          <a
            href="/podcasts"
            className="text-sm font-semibold leading-6 text-gray-900"
          >
            浏览播客 <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
