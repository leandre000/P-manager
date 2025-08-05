const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all goals for user
router.get('/', auth, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching goals' });
  }
});

// Get today's goals
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goals = await prisma.goal.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: today
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching today\'s goals' });
  }
});

// Create goal
router.post('/', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    // Check if user already has 5 goals for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayGoals = await prisma.goal.count({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: today
        }
      }
    });

    if (todayGoals >= 5) {
      return res.status(400).json({ error: 'Maximum 5 goals allowed per day' });
    }

    const goal = await prisma.goal.create({
      data: {
        title,
        description,
        userId: req.user.id
      }
    });

    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Error creating goal' });
  }
});

// Update goal (handle both PUT and PATCH)
const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    const goal = await prisma.goal.findUnique({
      where: { id }
    });

    if (!goal || goal.userId !== req.user.id) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Update streak if goal is being completed
    let streak = goal.streak;
    if (completed && !goal.completed) {
      streak += 1;
    } else if (!completed && goal.completed) {
      streak = Math.max(0, streak - 1);
    }

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: {
        title,
        description,
        completed,
        streak
      }
    });

    res.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Error updating goal' });
  }
};

router.patch('/:id', auth, updateGoal);
router.put('/:id', auth, updateGoal);

// Delete goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const goal = await prisma.goal.findUnique({
      where: { id }
    });

    if (!goal || goal.userId !== req.user.id) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.goal.delete({
      where: { id }
    });

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Error deleting goal' });
  }
});

module.exports = router; 