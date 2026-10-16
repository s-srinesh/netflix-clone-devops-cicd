const HomeScreenSkeleton = () => {
  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Shimmering Navbar */}
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4 h-20">
        <div className="flex items-center gap-8">
          <div className="w-28 sm:w-36 h-8 bg-gray-800 rounded shimmer" />
          <div className="hidden sm:flex gap-6">
            <div className="w-16 h-4 bg-gray-800 rounded shimmer" />
            <div className="w-20 h-4 bg-gray-800 rounded shimmer" />
            <div className="w-24 h-4 bg-gray-800 rounded shimmer" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 bg-gray-800 rounded-full shimmer" />
          <div className="w-8 h-8 bg-gray-800 rounded-full shimmer" />
        </div>
      </div>

      {/* Shimmering Hero Banner */}
      <div className="relative h-[65vh] sm:h-[75vh] flex flex-col justify-center px-8 md:px-16 max-w-6xl mx-auto">
        <div className="w-3/4 sm:w-1/2 h-10 sm:h-14 bg-gray-800/80 rounded-lg mb-4 shimmer" />
        <div className="w-32 h-5 bg-gray-800/70 rounded mb-4 shimmer" />
        <div className="w-full sm:w-2/3 h-4 bg-gray-800/70 rounded mb-2 shimmer" />
        <div className="w-4/5 sm:w-1/2 h-4 bg-gray-800/70 rounded mb-2 shimmer" />
        <div className="w-1/2 sm:w-1/3 h-4 bg-gray-800/70 rounded mb-6 shimmer" />
        <div className="flex gap-4">
          <div className="w-32 h-10 bg-gray-700/80 rounded-lg shimmer" />
          <div className="w-32 h-10 bg-gray-800/80 rounded-lg shimmer" />
        </div>
      </div>

      {/* Shimmering Category Rows */}
      <div className="flex flex-col gap-6 py-6 px-4 md:px-12 max-w-7xl mx-auto">
        {[1, 2].map((row) => (
          <div key={row} className="space-y-3">
            <div className="w-48 h-6 bg-gray-800 rounded shimmer" />
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4, 5].map((card) => (
                <div
                  key={card}
                  className="min-w-[160px] sm:min-w-[220px] h-32 bg-gray-800/60 rounded-lg shrink-0 shimmer"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomeScreenSkeleton;
