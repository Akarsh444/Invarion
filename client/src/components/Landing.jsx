export default function Landing({ onEnter }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <p className="text-sm font-medium text-gray-500 mb-3">Concurrent Inventory & Order Engine</p>
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight mb-5">Invarion</h1>
        <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mb-8">
          When two customers try to buy the last unit at the same moment, exactly one succeeds.
          Stock is never oversold — enforced by distributed locking, not by hoping it doesn't happen.
        </p>
               <div className="flex flex-wrap gap-3">
        <button
            onClick={onEnter}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
        >
            Try the live demo
        </button>

        <a
            href="/api-docs"
            className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
        >
            API documentation
        </a>

        <a
            href="https://github.com/Akarsh444/Invarion"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
        >
            Source on GitHub
        </a>
        </div>
      </div>

      {/* Demo credentials */}
      <div className="border-y border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Sign in with a demo account</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Admin</p>
              <p className="font-mono text-sm text-gray-900">admin@invarion.demo</p>
              <p className="font-mono text-sm text-gray-900">DemoAdmin123</p>
              <p className="text-xs text-gray-500 mt-2">Can create products and manage stock</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Customer</p>
              <p className="font-mono text-sm text-gray-900">customer@invarion.demo</p>
              <p className="font-mono text-sm text-gray-900">DemoUser123</p>
              <p className="text-xs text-gray-500 mt-2">Can browse and place orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* The problem */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">The problem this solves</h2>
        <p className="text-gray-600 leading-relaxed mb-6 max-w-2xl">
          One unit left. Two customers click "Buy" in the same millisecond. Both requests read
          the stock as <span className="font-mono text-sm">1</span>, both pass the availability
          check, and both orders get created — one unit sold twice. This is a real failure mode
          that costs real companies real money.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-lg border border-red-200 bg-red-50">
            <p className="text-sm font-semibold text-red-900 mb-2">Without locking</p>
            <p className="text-sm text-red-800 leading-relaxed">
              Both reads see 1 available → both orders succeed → inventory goes negative.
            </p>
          </div>
          <div className="p-5 rounded-lg border border-green-200 bg-green-50">
            <p className="text-sm font-semibold text-green-900 mb-2">With distributed locking</p>
            <p className="text-sm text-green-800 leading-relaxed">
              First request acquires the lock and reserves the unit. Second waits, re-reads fresh
              state, sees 0 available, and is rejected cleanly with a 409.
            </p>
          </div>
        </div>
      </div>

      {/* Try it yourself */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Try it yourself</h2>
          <ol className="space-y-4 max-w-2xl">
            {[
              ['Sign in', 'Use either demo account above, or register your own (new accounts are customers).'],
              ['Find the Limited Edition Mousepad', 'It has exactly one unit in stock — deliberately.'],
              ['Order it', 'Watch available stock drop to 0 and the order appear as PENDING. Stock is now reserved, not yet deducted.'],
              ['Try ordering it again', 'Rejected with "Insufficient stock" — the reservation is holding that unit.'],
              ['Open the API docs', 'Every endpoint is documented and callable directly from the browser.'],
            ].map(([title, body], i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-medium flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{title}</p>
                  <p className="text-sm text-gray-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">How it works</h2>
        <div className="space-y-5 max-w-2xl">
          {[
            ['Distributed locking', 'Order creation acquires a per-product lock in Redis using an atomic SET NX PX, and releases it via a Lua script that only deletes the lock if the caller still owns it. Multi-product orders acquire locks in sorted order so deadlocks are structurally impossible.'],
            ['Idempotency', 'Every order carries a client-supplied key. A duplicate request — double-click, network retry — returns the original order instead of creating a second one, backed by a unique database constraint.'],
            ['Order state machine', 'Orders move only through legal transitions. PENDING to DELIVERED directly is rejected before any write happens.'],
            ['Two-phase stock accounting', 'Placing an order reserves stock without deducting it. Confirming deducts it. Cancelling releases the hold. Stock is blocked from oversell without being permanently spent before confirmation.'],
          ].map(([title, body]) => (
            <div key={title}>
              <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stack */}
      <div className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Built with</h2>
          <div className="flex flex-wrap gap-2">
            {['Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Redis', 'React', 'Tailwind', 'Docker', 'GitHub Actions', 'Swagger'].map((t) => (
              <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">{t}</span>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-6">
            36 automated tests — 13 unit, 23 end-to-end — including one that fires two concurrent
            order requests and asserts exactly one succeeds. Runs on every push via CI.
          </p>
        </div>
      </div>

      <footer className="border-t border-gray-200 py-8">
        <p className="max-w-4xl mx-auto px-6 text-sm text-gray-400">
          Hosted on a free tier — the first request after inactivity may take up to a minute to wake.
        </p>
      </footer>
    </div>
  );
}