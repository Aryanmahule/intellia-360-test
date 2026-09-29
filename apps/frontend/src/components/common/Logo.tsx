import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function Logo() {
  return (
    <Link
      href="/student/dashboard"
      className="logo-brand"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 8px",
        borderRadius: "10px",
        textDecoration: "none",
        transition: "all 0.3s ease",
      }}
    >
      <div
        className="logo-wrapper"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "150px",
          height: "100px",
          overflow: "visible",
          filter:
            "drop-shadow(0 5px 8px rgba(0,0,0,.18)) drop-shadow(0 10px 20px rgba(37,99,235,.22))",
          transition: "all .3s ease",
        }}
      >
        <Image
          src="/assets/logo/intellia360-log.png"
          alt="Intellia360 Logo"
          width={150}
          height={100}
          priority
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </Link>
  );
}