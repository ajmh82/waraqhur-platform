import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";

type AccountMenuComponent = (props: Record<string, unknown>) => JSX.Element;
const SafeAccountMenu = AccountMenu as unknown as AccountMenuComponent;

export async function AppHeader() {
  return (
    <header className="app-header app-header--neo">
      <div className="app-header__inner app-header__inner--social">
        <div className="app-header__side app-header__side--left">
          <Link
            href="/timeline"
            style={{
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
            الرئيسية
          </Link>
        </div>

        <div className="app-header__center">
          <Link
            href="/timeline"
            className="app-header__brand"
            style={{
              fontWeight: 900,
              letterSpacing: "0.02em",
              fontSize: "20px",
            }}
            aria-label="Waraqhur Home"
          >
            ورق حر
          </Link>
        </div>

        <div className="app-header__side app-header__side--right">
          <SafeAccountMenu />
        </div>
      </div>
    </header>
  );
}
