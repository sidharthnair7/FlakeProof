"""CLI entry point.

    python -m agent initdb
    python -m agent verify <repo> <fqcn#method> [--times N] [--scope OtherTestClass]
    python -m agent findpolluter <repo> <fqcn#method>
    python -m agent status
"""
import argparse
from pathlib import Path

from agent import db


def main() -> None:
    p = argparse.ArgumentParser(prog="agent")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("initdb", help="create the sqlite schema")
    sub.add_parser("status", help="show what is recorded so far")

    v = sub.add_parser("verify", help="rerun a test N times and report the pass rate")
    v.add_argument("repo")
    v.add_argument("test", help="fully.qualified.ClassName#methodName")
    v.add_argument("--times", type=int, default=20)
    v.add_argument("--scope", default=None,
                   help="another test class to run alongside, e.g. a suspected polluter")

    f = sub.add_parser("findpolluter", help="find which test class breaks this one")
    f.add_argument("repo")
    f.add_argument("test", help="fully.qualified.ClassName#methodName")

    args = p.parse_args()

    if args.command == "initdb":
        db.init()
        print("db ready")
        return

    if args.command == "status":
        conn = db.connect()
        rows = list(conn.execute("""
            SELECT a.id, a.test_name, a.verdict,
                   COUNT(r.id) runs, COALESCE(SUM(r.passed), 0) passes
            FROM attempts a LEFT JOIN runs r ON r.attempt_id = a.id
            GROUP BY a.id ORDER BY a.id
        """))
        if not rows:
            print("no attempts recorded yet")
        for r in rows:
            rate = f"{r['passes']}/{r['runs']}" if r["runs"] else "-"
            print(f"  #{r['id']}  {r['verdict']:8}  {rate:>8}  {r['test_name']}")
        return

    fqcn, method = args.test.split("#", 1)

    if args.command == "verify":
        from agent import harness
        result = harness.rerun(Path(args.repo), fqcn, method,
                               times=args.times, scope=args.scope)
        print(f"\n{result}")
        print("VERIFIED (would open PR)" if result.all_passed
              else f"NOT PROVEN - {result.runs - result.passes} failure(s)")

    elif args.command == "findpolluter":
        from agent.polluter import Victim, find, test_classes
        repo = Path(args.repo)
        find(repo, Victim(fqcn, method), test_classes(repo))


if __name__ == "__main__":
    main()
