import { ProfilesSection } from "./sidebar/ProfilesSection";
import { SsoControl } from "./sidebar/SsoControl";
import { SecretsActions } from "./sidebar/SecretsActions";
import { BookmarksSection } from "./sidebar/BookmarksSection";
import { RecentSecretsSection } from "./sidebar/RecentSecretsSection";
import { VersionInfo } from "./sidebar/VersionInfo";

export function SidebarLeftPanel() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
        <ProfilesSection />
        <SsoControl />
        <SecretsActions />
        <BookmarksSection />
        <RecentSecretsSection />
      </div>
      <VersionInfo />
    </div>
  );
}
