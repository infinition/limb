async function ensureJson(response) {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'La requête a échoué.');
  }
  return response.json();
}

export async function fetchDashboard() {
  return ensureJson(await fetch('/api/dashboard'));
}

export async function saveDashboard(payload) {
  return ensureJson(
    await fetch('/api/dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
}

export async function saveWidgetState(itemId, state) {
  return ensureJson(
    await fetch(`/api/widgets/${itemId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state })
    })
  );
}

export async function saveWidgetToGallery(widget) {
  return ensureJson(
    await fetch('/api/widgets/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(widget)
    })
  );
}

export async function importWidgetFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  return ensureJson(
    await fetch('/api/widgets/import', {
      method: 'POST',
      body: formData
    })
  );
}

export async function deleteWidgetFromGallery(sourceFile) {
  const response = await fetch(`/api/widgets/gallery/${encodeURIComponent(sourceFile)}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Suppression du widget impossible.');
  }
}

export async function uploadAsset(kind, file) {
  const formData = new FormData();
  formData.append('file', file);
  return ensureJson(
    await fetch(`/api/upload/${kind}`, {
      method: 'POST',
      body: formData
    })
  );
}

export async function deleteWallpaper(fileName) {
  const response = await fetch(`/api/upload/wallpaper/${encodeURIComponent(fileName)}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Suppression du wallpaper impossible.');
  }
}

export async function deleteIcon(fileName) {
  const response = await fetch(`/api/upload/icon/${encodeURIComponent(fileName)}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Suppression de l\'icône impossible.');
  }
}

export async function exportBackup() {
  const response = await fetch('/api/backup/export');
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Backup export failed.');
  }
  return response.blob();
}

export async function importBackup(payload) {
  return ensureJson(
    await fetch('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
}