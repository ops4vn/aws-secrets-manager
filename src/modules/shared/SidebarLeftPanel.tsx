import { ProfilesSection } from "./sidebar/ProfilesSection";
import { SsoControl } from "./sidebar/SsoControl";
import { SecretsActions } from "./sidebar/SecretsActions";
import { BookmarksSection } from "./sidebar/BookmarksSection";
import { RecentSecretsSection } from "./sidebar/RecentSecretsSection";

export function SidebarLeftPanel() {
  return (
    <div className="flex flex-col gap-3">
      <ProfilesSection />
      <SsoControl />
      <SecretsActions />
      <BookmarksSection />
      <RecentSecretsSection />
    </div>
  );
}
