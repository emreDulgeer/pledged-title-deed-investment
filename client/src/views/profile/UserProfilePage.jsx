import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
      <div className="min-h-screen grid place-items-center bg-day-background dark:bg-night-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-day-accent dark:border-night-accent" />
          <p className="mt-4 text-sm text-day-text/60 dark:text-night-text/60">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-day-background dark:bg-night-background px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-day-border dark:border-night-border bg-day-surface dark:bg-night-surface p-8 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-day-text dark:text-night-text hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="mt-6 text-2xl font-semibold text-day-text dark:text-night-text">
            Profile unavailable
          </h1>
          <p className="mt-2 text-day-text/60 dark:text-night-text/60">
            {error || "This profile could not be found."}
          </p>
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
