import GatePanel from '@/components/admin/GatePanel';
import { signInCopy as copy } from '@/content/kit';
import { fill } from '@/lib/admin-payments';
import { getViewer } from '@/lib/auth';

import { signIn, signOut } from './actions';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const viewer = await getViewer();

  return (
    <GatePanel eyebrow={copy.eyebrow} title={copy.title} lede={copy.lede} accent>
      {viewer ? (
        <form action={signOut} className="admin-actions">
          <p>{fill(copy.signedInAs, { email: viewer.email })}</p>
          <button type="submit" className="admin-button">
            {copy.signOut}
          </button>
        </form>
      ) : (
        <form action={signIn} className="admin-form">
          {error && (
            <p className="admin-error" role="alert">
              {copy.error}
            </p>
          )}
          <input type="hidden" name="next" value={next ?? ''} />
          <p className="admin-field">
            <label className="admin-field__label" htmlFor="email">
              {copy.email}
            </label>
            <input className="admin-field__input" id="email" type="email" name="email" autoComplete="username" required />
          </p>
          <p className="admin-field">
            <label className="admin-field__label" htmlFor="password">
              {copy.password}
            </label>
            <input
              className="admin-field__input"
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </p>
          <div className="admin-actions">
            <button type="submit" className="admin-button">
              {copy.submit}
            </button>
          </div>
        </form>
      )}
    </GatePanel>
  );
}
