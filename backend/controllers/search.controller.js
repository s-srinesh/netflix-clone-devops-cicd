import { fetchFromTMDB } from '../services/tmdb.service.js';
import SearchHistory from '../models/searchHistory.model.js';

/**
 * Saves search results to the user's profile in PostgreSQL database.
 *
 * @param {string} type - The type of search ('person', 'movie', 'tv').
 * @param {number|string} userId - The ID of the user performing the search.
 * @param {number|string} id - The content ID.
 * @param {string} name - The title or actor name.
 * @param {string} image - Poster or profile path.
 */
async function saveSearchResults(type, userId, id, name, image) {
  try {
    const contentId = parseInt(id);
    const existing = await SearchHistory.findOne({
      where: { userId, contentId },
    });

    if (existing) return;

    await SearchHistory.create({
      userId,
      contentId,
      name,
      image,
      searchType: type,
    });
  } catch (error) {
    console.error('Error saving search results in database:', error.message);
  }
}

// Search for people by name
export const searchPerson = async (req, res) => {
  try {
    const { query } = req.params;
    const response = await fetchFromTMDB(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(query)}&language=en-US&page=1`
    );

    if (!response.results || response.results.length === 0) {
      return res.status(404).json({ success: false, message: 'Not Found' });
    }

    const { id, name, profile_path } = response.results[0];
    await saveSearchResults('person', req.user.id, id, name, profile_path);

    res.status(200).json({ success: true, content: response.results });
  } catch (error) {
    console.error('An error occurred in searchPerson controller:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

// Search for movies by title
export const searchMovie = async (req, res) => {
  try {
    const { query } = req.params;
    const response = await fetchFromTMDB(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=en-US&page=1`
    );

    if (!response.results || response.results.length === 0) {
      return res.status(404).json({ success: false, message: 'Not Found' });
    }

    const { id, title, poster_path } = response.results[0];
    await saveSearchResults('movie', req.user.id, id, title, poster_path);

    res.status(200).json({ success: true, content: response.results });
  } catch (error) {
    console.error('An error occurred in searchMovie controller:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

// Search for TV shows by title
export const searchTvShow = async (req, res) => {
  try {
    const { query } = req.params;
    const response = await fetchFromTMDB(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&language=en-US&page=1`
    );

    if (!response.results || response.results.length === 0) {
      return res.status(404).json({ success: false, message: 'Not Found' });
    }

    const { id, name, poster_path } = response.results[0];
    await saveSearchResults('tv', req.user.id, id, name, poster_path);

    res.status(200).json({ success: true, content: response.results });
  } catch (error) {
    console.error('An error occurred in searchTvShow controller:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

// Get the user's search history
export const getSearchHistory = async (req, res) => {
  try {
    const items = await SearchHistory.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    const searchHistory = items.map((item) => ({
      id: item.contentId,
      name: item.name,
      image: item.image,
      searchType: item.searchType,
      createdAt: item.createdAt,
    }));

    res.status(200).json({
      success: true,
      content: { searchHistory },
    });
  } catch (error) {
    console.error('An error occurred in getSearchHistory controller:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

// Remove an entry from search history
export const removeFromSearchHistory = async (req, res) => {
  try {
    let { id } = req.params;
    const contentId = parseInt(id);

    await SearchHistory.destroy({
      where: {
        userId: req.user.id,
        contentId,
      },
    });

    res.status(200).json({ success: true, message: 'Search result removed from history' });
  } catch (error) {
    console.error('An error occurred in removeFromSearchHistory controller:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};
