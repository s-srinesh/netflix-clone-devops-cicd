import axios from 'axios';
import { useEffect, useState } from 'react';

import { useContentStore } from '../store/content.store';

const useGetTrendingContent = () => {
  const [trendingContent, setTrendingContent] = useState(null);
  const { contentType } = useContentStore();

  useEffect(() => {
    let isMounted = true;

    // Fetch trending content based on the current content type
    const getTrendingContent = async () => {
      try {
        const res = await axios.get(`/api/v1/${contentType}/trending`);
        if (isMounted && res.data?.content) {
          setTrendingContent(res.data.content);
        }
      } catch (error) {
        console.error('Failed to fetch trending content:', error);
      }
    };

    getTrendingContent();

    return () => {
      isMounted = false;
    };
  }, [contentType]);

  return { trendingContent };
};

export default useGetTrendingContent;
