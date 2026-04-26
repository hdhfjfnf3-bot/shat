import { Router, type IRouter } from "express";
import { createUser, findUserByUsername, verifyPassword, generateToken } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== "string" || username.length < 2) {
      res.status(400).json({ error: "Invalid username. Must be at least 2 characters." });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Invalid password. Must be at least 6 characters." });
      return;
    }

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      res.status(409).json({ error: "Username is already taken." });
      return;
    }

    const user = await createUser(username, password);
    const token = generateToken(user.username);

    res.status(201).json({
      message: "User registered successfully",
      user: { username: user.username },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const user = await findUserByUsername(username);
    if (!user) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const token = generateToken(user.username);

    res.json({
      message: "Logged in successfully",
      user: { username: user.username },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/check-user/:username", async (req, res) => {
  const { username } = req.params;
  if (!username || username.length < 2) {
    res.status(400).json({ error: "Invalid username." });
    return;
  }
  const user = await findUserByUsername(username);
  if (!user) {
    res.status(404).json({ exists: false, error: "User not found." });
    return;
  }
  res.json({ exists: true, username: user.username });
  return;
});

export default router;
