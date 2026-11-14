import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { Track } from "../src/models/Track.js";

let server, base;
const originalExists=User.exists;
const originalFindById=Track.findById;
const userId = new mongoose.Types.ObjectId().toString();
const authorization = `Bearer ${jwt.sign(
  { sub: userId, email: "test@example.com" },
  process.env.JWT_SECRET || "tp1-development-secret",
)}`;

test.before(async () => {
  User.exists=async()=>true;
  server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {User.exists=originalExists;Track.findById=originalFindById;server.close();});

test("health sans dépendre de MongoDB", async () => {
  const r = await fetch(base + "/api/health");
  assert.equal(r.status, 200);
  assert.equal((await r.json()).status, "ok");
});

test("schémas Mongoose et relation", () => {
  const u = new User({
    name: "Test",
    email: "TEST@example.com",
    password: "12345678",
  });

  assert.equal(u.email, "test@example.com");
  const t = new Track({
    ownerId: new mongoose.Types.ObjectId(),
    title: "Blues",
    originalName: "b.mp3",
    storedName: "x.mp3",
    mimeType: "audio/mpeg",
    size: 42,
  });
  
  assert.equal(t.title, "Blues");
  assert.equal(Track.schema.path("ownerId").options.ref, "User");
});

test("route protégée refusée sans JWT", async () => {
  const response = await fetch(base + "/api/tracks");

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Authentification requise" });
});

test("route protégée refusée avec un JWT invalide", async () => {
  const response = await fetch(base + "/api/tracks", {
    headers: { Authorization: "Bearer jeton-invalide" },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { message: "Jeton invalide ou expiré" });
});

test("upload refusé lorsqu'aucun fichier audio n'est fourni", async () => {
  const body = new FormData();
  body.append("title", "Sans fichier");

  const response = await fetch(base + "/api/tracks", {
    method: "POST",
    headers: { Authorization: authorization },
    body,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Fichier audio requis" });
});

test("upload refusé lorsque le type MIME n'est pas audio", async () => {
  const body = new FormData();
  body.append("title", "Faux audio");
  body.append("audio", new Blob(["texte"], { type: "text/plain" }), "faux.mp3");

  const response = await fetch(base + "/api/tracks", {
    method: "POST",
    headers: { Authorization: authorization },
    body,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Format audio non accepté" });
});

test("pagination applique page et limit sans utiliser MongoDB", async () => {
  const originalFind = Track.find;
  const originalCountDocuments = Track.countDocuments;
  const calls = { skip: undefined, limit: undefined, filter: undefined };

  Track.find = (filter) => {
    calls.filter = filter;
    const query = {
      sort: () => query,
      skip: (value) => {
        calls.skip = value;
        return query;
      },
      limit: (value) => {
        calls.limit = value;
        return query;
      },
      select: () => query,
      lean: async () => [],
    };
    return query;
  };
  Track.countDocuments = async (filter) => {
    assert.equal(String(filter.ownerId), userId);
    return 15;
  };

  try {
    const response = await fetch(base + "/api/tracks?page=3&limit=7", {
      headers: { Authorization: authorization },
    });
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(String(calls.filter.ownerId), userId);
    assert.equal(calls.skip, 14);
    assert.equal(calls.limit, 7);
    assert.deepEqual(result, {
      items: [], page: 3, limit: 7, total: 15, pages: 3,
    });
  } finally {
    Track.find = originalFind;
    Track.countDocuments = originalCountDocuments;
  }
});

test("accès audio refusé pour une piste qui n'appartient pas à l'utilisateur", async () => {
  const originalFindOne = Track.findOne;
  const otherTrackId = new mongoose.Types.ObjectId().toString();
  let receivedFilter;

  Track.findById = value => { receivedFilter={_id:value}; return {select:async()=>null}; };

  try {
    const response = await fetch(base + `/api/tracks/${otherTrackId}/audio`, {
      headers: { Authorization: authorization },
    });

    assert.equal(response.status, 404);
    assert.equal(receivedFilter._id, otherTrackId);

    assert.deepEqual(await response.json(), { message: "Piste inaccessible" });
  } finally {
    Track.findOne = originalFindOne;
  }
});


test("JSON invalide : aucune donnée du corps dans la réponse ou les logs", async () => {
  const marker = 'private-json-marker-123';
  const originalError = console.error;
  let leaked = false;
  console.error = (...args) => {
    leaked ||= args.some(value => String(value).includes(marker) || (value?.body || '').includes(marker));
  };
  try {
    const response = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: '{"password":"' + marker + '",}',
    });
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.equal(JSON.stringify(result).includes(marker), false);
    assert.deepEqual(result, {message: 'JSON invalide'});
    assert.equal(leaked, false);
  } finally {
    console.error = originalError;
  }
});
