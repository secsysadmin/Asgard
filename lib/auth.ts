// The studio is currently open to anyone with the /admin link.
// When Google OAuth is added, check the signed-in user here; every studio
// API route and the /admin page already gate on isAuthorized().
export async function isAuthorized() {
  return true;
}

export function unauthorized() {
  return Response.json({ error: "Sign in to the studio to make changes." }, { status: 401 });
}
