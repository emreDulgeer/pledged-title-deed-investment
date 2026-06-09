import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../../store/slices/authSlice";
import { getUserId } from "../../utils/profileRoutes";
import profileController from "../../controllers/profileController";
import PrivateProfilePage from "./PrivateProfilePage";
import PublicProfilePage from "./PublicProfilePage";

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const currentUser = useSelector(selectUser);
  const viewerRole = currentUser?.role || "guest";
  const currentUserId = getUserId(currentUser);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setError("Profile id is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await profileController.getByUserId(userId);
        setProfile(response.data);
        setError("");
      } catch (loadError) {
        setError(loadError.message || "Profile could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-day-background p-4 dark:bg-night-background">
        <div className="shell-surface px-8 py-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-day-primary dark:text-night-primary" />
          <p className="mt-4 text-sm text-day-muted dark:text-night-muted">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-day-background p-4 dark:bg-night-background">
        <div className="shell-surface w-full max-w-2xl px-8 py-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-day-primary transition hover:underline dark:text-night-primary"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.1} />
            Back
          </button>
          <div className="mt-6 flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-400/10 dark:text-red-200">
              <AlertCircle className="h-6 w-6" strokeWidth={2.1} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-day-text dark:text-night-text">
                Profile unavailable
              </h1>
              <p className="mt-2 text-sm leading-6 text-day-muted dark:text-night-muted">
            {error || "This profile could not be found."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sharedProps = {
    profile,
    isOwnProfile: currentUserId && currentUserId === profile.id,
    onBack: () => navigate(-1),
    viewerRole,
  };

  return profile.viewMode === "private" ? (
    <PrivateProfilePage {...sharedProps} />
  ) : (
    <PublicProfilePage {...sharedProps} />
  );
};

export default UserProfilePage;
