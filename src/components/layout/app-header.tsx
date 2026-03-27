import Link from "next/link";
import { AccountMenu } from "@/components/layout/account-menu";

type AnyPropsComponent = (props: Record<string, unknown>) => JSX.Element;
const SafeAccountMenu = AccountMenu as unknown as AnyPropsComponent;

export async function AppHeader() {
  return (
    <header className="app-header app-header--centered">
      <div className="app-header__inner">
        <div className="app-header__side app-header__side--left" />
        <div className="app-header__center">
          <Link href="/timeline" className="app-header__logo" aria-label="Waraqhur Home">
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
