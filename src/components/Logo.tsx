import { Icon } from "./ui";

/**
 * The club's mark when one was uploaded in Setup, otherwise the app's own ball.
 * `className` sizes the tile; the image is contained inside it.
 */
export default function Logo({ logo, className, iconClassName }: { logo: string | null; className: string; iconClassName: string }) {
  if (logo) {
    return <img src={logo} alt="" className={`${className} object-contain`} />;
  }
  return (
    <span className={`${className} grid place-items-center bg-navy text-yellow`}>
      <Icon name="ball" className={iconClassName} />
    </span>
  );
}
