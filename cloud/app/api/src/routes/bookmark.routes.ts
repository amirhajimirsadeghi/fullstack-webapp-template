import { Router } from 'express';
import { BookmarkController } from '../controllers/bookmark.controller';

const router = Router();
const controller = new BookmarkController();

// Create a new bookmark
router.post('/', async (req, res, next) => {
  try {
    const bookmark = await controller.createBookmark(req.body);
    res.status(201).json(bookmark);
  } catch (error) {
    next(error);
  }
});

// Get all bookmarks
router.get('/', async (req, res, next) => {
  try {
    const bookmarks = await controller.getAllBookmarks();
    res.json(bookmarks);
  } catch (error) {
    next(error);
  }
});

// Get a single bookmark
router.get('/:id', async (req, res, next) => {
  try {
    const bookmark = await controller.getBookmarkById(req.params.id);
    if (!bookmark) {
      res.status(404).json({ message: 'Bookmark not found' });
      return;
    }
    res.json(bookmark);
  } catch (error) {
    next(error);
  }
});

// Update a bookmark
router.put('/:id', async (req, res, next) => {
  try {
    const bookmark = await controller.updateBookmark(req.params.id, req.body);
    if (!bookmark) {
      res.status(404).json({ message: 'Bookmark not found' });
      return;
    }
    res.json(bookmark);
  } catch (error) {
    next(error);
  }
});

// Delete a bookmark
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await controller.deleteBookmark(req.params.id);
    if (!success) {
      res.status(404).json({ message: 'Bookmark not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const bookmarkRouter = router; 