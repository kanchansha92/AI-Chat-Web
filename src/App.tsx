

import { useEffect } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { Provider } from "react-redux";

import { bootstrap } from "./redux/authSlice";
import { bootGeneralChats } from "./redux/generalChatsSlice";
import { isFreshVisit } from "./lib/session";
import LandingPage from "./pages/Landing";
import SignUpPage from "./pages/Signuppage";
import SignInPage from "./pages/Signinpage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import OnboardingPage from "./pages/Onboardingpage";
import { useAppDispatch, useAppSelector } from "./hook/hooks";
import { RedirectIfAuthed, RequireAuth, RequireOnboarding } from "./redux/RouteGuards";
import { store } from "./redux/store";
import HomePage from "./pages/Homepage";
import CharacterBuilderPage from "./pages/CharacterBuilderPage";
import ChatPage from "./pages/ChatPage";
import JournalPage from "./pages/JournalPage";
import JournalNewThreadPage from "./pages/JournalNewThreadPage";
import JournalEntryPage from "./pages/JournalEntryPage";
import GroupFormationPage from "./pages/GroupFormationPage";
import GroupChatPage from "./pages/GroupChatPage";
import GroupDetailsPage from "./pages/GroupDetailsPage";
import SettingsPage from "./pages/SettingsPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import ExportDataPage from "./pages/ExportDataPage";
import ProfilePage from "./pages/ProfilePage";
import BillingPage from "./pages/BillingPage";
import CreditsPage from "./pages/CreditsPage";
import UsagePage from "./pages/UsagePage";
import PersonasPage from "./pages/PersonasPage";
import PublicCharacterPage from "./pages/PublicCharacterPage";
import LegalPage from "./pages/LegalPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PastDueBanner from "./components/PastDueBanner";
import AdminBillingPage from "./pages/admin/BillingPage";
import PlansPage from "./pages/PlansPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorPage from "./pages/ErrorPage";
import MaintenancePage from "./pages/MaintenancePage";
import RateLimitedPage from "./pages/RateLimitedPage";
import NetworkHost from "./components/NetworkHost";
import ErrorBoundary from "./components/ErrorBoundary";
import TrialBanner from "./components/TrialBanner";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/DashboardPage";
import AdminUsersPage from "./pages/admin/UsersPage";
import AdminPlansPage from "./pages/admin/PlansPage";
import AdminProvidersPage from "./pages/admin/ProvidersPage";

/**
 * JournalEntryPage, remounted whenever the thread changes.
 *
 * The key has to be applied inside the route element rather than on the <Route>
 * itself, because only a component rendered under the route can read the param.
 */
function KeyedJournalEntryPage() {
  const { threadId } = useParams();
  return <JournalEntryPage key={threadId} />;
}

function AppRoutes() {
  const dispatch = useAppDispatch();

  // Revalidates a saved token against GET /auth/me so the session survives
  // a page refresh.
  useEffect(() => {
    dispatch(bootstrap());
    // A new tab starts on an empty composer; a reload or in-app nav keeps
    // whatever chat was open. isFreshVisit() tells the two apart per tab.
    dispatch(bootGeneralChats({ freshVisit: isFreshVisit() }));
  }, [dispatch]);

  // data-theme on <html> repoints the palette in index.css. Signed-out users
  // and anyone who hasn't picked get "paper".
  const theme = useAppSelector((s) => s.auth.user?.theme);
  useEffect(() => {
    const mode = theme === "LAMPLIGHT" ? "lamplight" : "paper";
    document.documentElement.setAttribute("data-theme", mode);
  }, [theme]);

  return (
    <>
      {/* §9.2 offline banner + rate-limit toast, §9.3 maintenance redirect. */}
      <NetworkHost />
      {/* §12.4 - self-managing, shows only in the trial's final 24h. */}
      <TrialBanner />
      {/* A failed renewal keeps the plan for a few days - say so while it lasts. */}
      <PastDueBanner />
      <Routes>
        {/* Signed-out only: a logged-in user hitting "/" goes to /home, or to
          /onboarding if they haven't finished it. */}
        <Route
          path="/"
          element={
            <RedirectIfAuthed>
              <LandingPage />
            </RedirectIfAuthed>
          }
        />

        <Route
          path="/signup"
          element={
            <RedirectIfAuthed>
              <SignUpPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/signin"
          element={
            <RedirectIfAuthed>
              <SignInPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RedirectIfAuthed>
              <ForgotPasswordPage />
            </RedirectIfAuthed>
          }
        />
        {/* Ungated on purpose - the token in the emailed link is the credential. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <RequireOnboarding>
              <OnboardingPage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/character-builder"
          element={
            <RequireAuth>
              <CharacterBuilderPage />
            </RequireAuth>
          }
        />
        <Route
          path="/chat/:characterId"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/group/new"
          element={
            <RequireAuth>
              <GroupFormationPage />
            </RequireAuth>
          }
        />
        <Route
          path="/group/:groupId"
          element={
            <RequireAuth>
              <GroupChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/group/:groupId/details"
          element={
            <RequireAuth>
              <GroupDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        {/* §12.5 account deletion (3-step) + §12.7 data export (2-step) */}
        <Route
          path="/settings/delete"
          element={
            <RequireAuth>
              <DeleteAccountPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/export"
          element={
            <RequireAuth>
              <ExportDataPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/billing"
          element={
            <RequireAuth>
              <BillingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/credits"
          element={
            <RequireAuth>
              <CreditsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/usage"
          element={
            <RequireAuth>
              <UsagePage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/personas"
          element={
            <RequireAuth>
              <PersonasPage />
            </RequireAuth>
          }
        />
        {/* The legal documents inside the app: same page as /legal, without
          the public site's navbar and footer. */}
        <Route
          path="/settings/legal"
          element={
            <RequireAuth>
              <LegalPage inApp />
            </RequireAuth>
          }
        />
        {/* A shared character card - one of two routes a stranger can open. */}
        <Route path="/c/:slug" element={<PublicCharacterPage />} />

        {/* Ungated on purpose, and it has to stay that way. A policy only
          account-holders can read is not published, and both app stores ask
          for a URL that opens without signing in. /privacy and /terms are
          the old addresses; they open the matching tab of /legal. */}
        <Route path="/legal" element={<LegalPage />} />
        <Route path="/privacy" element={<Navigate to="/legal#privacy" replace />} />
        <Route path="/terms" element={<Navigate to="/legal#terms" replace />} />
        {/* Ungated for the same reason: the about page is for strangers. */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route
          path="/settings/help"
          element={
            <RequireAuth>
              <HelpSupportPage />
            </RequireAuth>
          }
        />
        <Route
          path="/plans"
          element={
            <RequireAuth>
              <PlansPage />
            </RequireAuth>
          }
        />
        <Route
          path="/plans/checkout"
          element={
            <RequireAuth>
              <PaymentPage />
            </RequireAuth>
          }
        />
        <Route
          path="/plans/success"
          element={
            <RequireAuth>
              <PaymentSuccessPage />
            </RequireAuth>
          }
        />
        <Route
          path="/journal"
          element={
            <RequireAuth>
              <JournalPage />
            </RequireAuth>
          }
        />
        <Route
          path="/journal/new"
          element={
            <RequireAuth>
              <JournalNewThreadPage />
            </RequireAuth>
          }
        />
        {/* Keyed on the thread id so moving between threads REMOUNTS the page.
          The sidebar navigates within the same route pattern, so React Router
          otherwise keeps the component and changes only the param - and the
          composer's state came along: draftId still pointed at an entry in the
          previous thread, so `persist` PATCHed thread B's words into thread A's
          entry. A key resets every field at once, which resetting them by hand
          in an effect cannot be trusted to do as fields are added. */}
        <Route
          path="/journal/:threadId"
          element={
            <RequireAuth>
              <KeyedJournalEntryPage />
            </RequireAuth>
          }
        />

        {/* §11. AdminLayout checks the ADMIN_EMAILS allowlist server-side and
          bounces non-admins back to /home. */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="billing" element={<AdminBillingPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="providers" element={<AdminProvidersPage />} />
        </Route>

        <Route path="/error" element={<ErrorPage />} />

        {/* Full-screen system states (brief §9.3). */}
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/rate-limited" element={<RateLimitedPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      {/* Without this, one bad line anywhere below unmounts the entire tree and
        the user gets a blank white page with nothing to go on - which is how a
        `.toFixed()` on an undefined moderation threshold in the admin Providers
        screen presented. Now a render crash shows the error and leaves a way
        back. */}
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
