// The studio is open to anyone with the /admin link: every studio route and /admin gate here.
export async function isAuthorized() {
  return true;
}

export function unauthorized() {
  return Response.json({ error: "Sign in to the studio to make changes." }, { status: 401 });
}
