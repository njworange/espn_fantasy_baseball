from __future__ import annotations

import json
import os
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from espn_api.baseball import League


load_dotenv()


@dataclass(frozen=True)
class FetcherConfig:
    league_id: int
    season_year: int
    espn_s2: str
    swid: str
    output_path: Path


def env_value(name: str) -> str:
    return os.getenv(name, "").strip()


def get_default_season_year() -> int:
    """
    Auto-calculate season year based on date:
    - Before March 1st: use previous year (previous season still active)
    - On/after March 1st: use current year (new season started)
    """
    now = datetime.now()
    # March 1st is the cutoff for new MLB season
    if now.month < 3 or (now.month == 3 and now.day < 1):
        return now.year - 1
    return now.year


def parse_config() -> FetcherConfig:
    # Auto-calculate season year if not provided
    # Use .env SEASON_YEAR if set, otherwise calculate based on March 1st cutoff
    env_season = env_value("SEASON_YEAR")
    if env_season:
        season_year_str = env_season
    else:
        season_year_str = str(get_default_season_year())
    
    # Build output path - always include season in filename
    env_output = env_value("OUTPUT_PATH")
    if env_output:
        # If custom path provided, insert season before .json
        if env_output.endswith('.json'):
            output_path = env_output.replace('.json', f'-{season_year_str}.json')
        else:
            output_path = f"{env_output}-{season_year_str}.json"
    else:
        output_path = f"./output/league-snapshot-{season_year_str}.json"
    
    values = {
        "LEAGUE_ID": env_value("LEAGUE_ID"),
        "SEASON_YEAR": season_year_str,
        "ESPN_S2": env_value("ESPN_S2"),
        "SWID": env_value("SWID"),
        "OUTPUT_PATH": output_path,
    }
    missing = [key for key in ("LEAGUE_ID", "ESPN_S2", "SWID") if not values[key]]
    if missing:
        missing_list = ", ".join(missing)
        raise ValueError(f"Missing environment variables: {missing_list}")

    try:
        league_id = int(values["LEAGUE_ID"])
        season_year = int(values["SEASON_YEAR"])
    except ValueError as exc:
        raise ValueError("LEAGUE_ID and SEASON_YEAR must be integers") from exc

    return FetcherConfig(
        league_id=league_id,
        season_year=season_year,
        espn_s2=values["ESPN_S2"],
        swid=values["SWID"],
        output_path=Path(values["OUTPUT_PATH"]),
    )


def load_league(config: FetcherConfig) -> League:
    return League(
        league_id=config.league_id,
        year=config.season_year,
        espn_s2=config.espn_s2,
        swid=config.swid,
    )


def team_label(team: Any) -> str:
    return getattr(team, "team_name", "Unknown Team")


def team_record(team: Any) -> str:
    wins = getattr(team, "wins", 0)
    losses = getattr(team, "losses", 0)
    ties = getattr(team, "ties", 0)
    return f"{wins}-{losses}" if not ties else f"{wins}-{losses}-{ties}"


def safe_numeric(value: Any) -> float | None:
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value))
    except (TypeError, ValueError):
        return None


def format_stat_value(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.2f}" if not value.is_integer() else str(int(value))
    return str(value)


def extract_stat_payload(stat_value: Any) -> dict[str, Any]:
    if isinstance(stat_value, dict):
        numeric_candidates = [
            stat_value.get("score"),
            stat_value.get("value"),
            stat_value.get("stat"),
            stat_value.get("total"),
            stat_value.get("applied"),
        ]
        display_value = next((candidate for candidate in numeric_candidates if candidate is not None), None)
        if display_value is None and len(stat_value) == 1:
            display_value = next(iter(stat_value.values()))
        if display_value is None:
            display_value = stat_value.get("result") or stat_value.get("winner") or stat_value
        result = stat_value.get("result") or stat_value.get("winner")
        return {
            "display": format_stat_value(display_value),
            "numeric": safe_numeric(display_value),
            "result": result,
        }

    return {
        "display": format_stat_value(stat_value),
        "numeric": safe_numeric(stat_value),
        "result": None,
    }


def extract_score(box_score: Any, side: str) -> Any:
    for attr in (f"{side}_score", f"{side}_points"):
        value = getattr(box_score, attr, None)
        if value is not None:
            return value

    wins = getattr(box_score, f"{side}_wins", None)
    if wins is not None:
        return wins

    stats = getattr(box_score, f"{side}_stats", None)
    if isinstance(stats, dict):
        category_wins = 0
        for value in stats.values():
            if isinstance(value, dict):
                outcome = value.get("result") or value.get("winner")
                if outcome in {"WIN", "W"}:
                    category_wins += 1
        if category_wins:
            return category_wins

    return "-"


def get_box_scores(league: League, matchup_period: int | None = None) -> list[Any]:
    try:
        if matchup_period is None:
            return list(league.box_scores())
        return list(league.box_scores(matchup_period=matchup_period))
    except TypeError:
        return list(league.box_scores())


def find_team_box_score(box_scores: list[Any], team_name: str) -> Any | None:
    for box_score in box_scores:
        home_name = team_label(getattr(box_score, "home_team", None))
        away_name = team_label(getattr(box_score, "away_team", None))
        if team_name in {home_name, away_name}:
            return box_score
    return None


def build_standings(league: League) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, team in enumerate(league.standings(), start=1):
        rows.append(
            {
                "teamId": getattr(team, "team_id", index),
                "rank": getattr(team, "standing", index),
                "name": team_label(team),
                "record": team_record(team),
                "wins": getattr(team, "wins", 0),
                "losses": getattr(team, "losses", 0),
                "ties": getattr(team, "ties", 0),
                "owner": getattr(team, "owner", "-"),
            }
        )
    return rows


def build_matchup_categories(box_score: Any) -> list[dict[str, Any]]:
    home_stats = getattr(box_score, "home_stats", None) or {}
    away_stats = getattr(box_score, "away_stats", None) or {}
    stat_keys = sorted(set(home_stats.keys()) | set(away_stats.keys()), key=str)
    categories: list[dict[str, Any]] = []

    for key in stat_keys:
        home_payload = extract_stat_payload(home_stats.get(key))
        away_payload = extract_stat_payload(away_stats.get(key))
        leader = "even"
        if home_payload["result"] in {"WIN", "W"} or away_payload["result"] in {"LOSS", "L"}:
            leader = "home"
        elif away_payload["result"] in {"WIN", "W"} or home_payload["result"] in {"LOSS", "L"}:
            leader = "away"
        elif home_payload["numeric"] is not None and away_payload["numeric"] is not None:
            if home_payload["numeric"] > away_payload["numeric"]:
                leader = "home"
            elif away_payload["numeric"] > home_payload["numeric"]:
                leader = "away"

        categories.append(
            {
                "name": str(key),
                "home": home_payload["display"],
                "away": away_payload["display"],
                "leader": leader,
            }
        )
    return categories


def build_matchups(league: League) -> list[dict[str, Any]]:
    matchup_period = getattr(league, "currentMatchupPeriod", None)
    box_scores = get_box_scores(league, matchup_period)
    rows: list[dict[str, Any]] = []

    for index, box_score in enumerate(box_scores, start=1):
        home_team = getattr(box_score, "home_team", None)
        away_team = getattr(box_score, "away_team", None)
        rows.append(
            {
                "id": f"matchup-{index}",
                "period": matchup_period,
                "label": f"{team_label(away_team)} at {team_label(home_team)}",
                "homeTeam": team_label(home_team),
                "awayTeam": team_label(away_team),
                "homeScore": format_stat_value(extract_score(box_score, "home")),
                "awayScore": format_stat_value(extract_score(box_score, "away")),
                "homeRecord": team_record(home_team) if home_team else "-",
                "awayRecord": team_record(away_team) if away_team else "-",
                "categories": build_matchup_categories(box_score),
            }
        )

    return rows


def build_roster(team: Any) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for player in getattr(team, "roster", []):
        rows.append(
            {
                "name": getattr(player, "name", "Unknown Player"),
                "position": getattr(player, "position", "-"),
                "proTeam": getattr(player, "proTeam", "-"),
                "injuryStatus": getattr(player, "injuryStatus", "-"),
                "points": format_stat_value(getattr(player, "total_points", getattr(player, "points", None))),
            }
        )
    return rows


def build_roster_composition(team: Any) -> list[dict[str, Any]]:
    counts = Counter(getattr(player, "position", "Unknown") for player in getattr(team, "roster", []))
    rows = [{"position": position, "count": count} for position, count in counts.items()]
    rows.sort(key=lambda item: (-item["count"], item["position"]))
    return rows


def build_weekly_trend(league: League, team: Any) -> list[dict[str, Any]]:
    current_period = getattr(league, "currentMatchupPeriod", 1) or 1
    team_name = team_label(team)
    rows: list[dict[str, Any]] = []

    for matchup_period in range(1, int(current_period) + 1):
        team_box_score = find_team_box_score(get_box_scores(league, matchup_period), team_name)
        if team_box_score is None:
            continue

        home_name = team_label(getattr(team_box_score, "home_team", None))
        away_name = team_label(getattr(team_box_score, "away_team", None))
        is_home = team_name == home_name
        side = "home" if is_home else "away"
        opponent_name = away_name if is_home else home_name
        opponent_side = "away" if is_home else "home"

        team_score = extract_score(team_box_score, side)
        opponent_score = extract_score(team_box_score, opponent_side)
        team_numeric = safe_numeric(team_score)
        opponent_numeric = safe_numeric(opponent_score)

        team_wins = getattr(team_box_score, f"{side}_wins", None)
        team_losses = getattr(team_box_score, f"{side}_losses", None)
        team_ties = getattr(team_box_score, f"{side}_ties", None)

        outcome = "even"
        if team_numeric is not None and opponent_numeric is not None:
            if team_numeric > opponent_numeric:
                outcome = "win"
            elif team_numeric < opponent_numeric:
                outcome = "loss"
        elif team_wins is not None and team_losses is not None:
            if team_wins > team_losses:
                outcome = "win"
            elif team_wins < team_losses:
                outcome = "loss"

        rows.append(
            {
                "week": matchup_period,
                "opponent": opponent_name,
                "score": team_numeric,
                "scoreDisplay": format_stat_value(team_score),
                "opponentScore": opponent_numeric,
                "opponentScoreDisplay": format_stat_value(opponent_score),
                "categoryWins": team_wins,
                "categoryLosses": team_losses,
                "categoryTies": team_ties,
                "outcome": outcome,
            }
        )

    return rows


def calculate_stats_for_weeks(league: League, team: Any, max_week: int) -> dict[str, dict[str, int]]:
    """Calculate cumulative category wins/losses/ties up to specified week."""
    team_name = team_label(team)
    
    # Initialize category stats
    categories = ["R", "HR", "RBI", "SB", "AVG", "K", "W", "SV", "ERA", "WHIP"]
    stats = {cat: {"wins": 0, "losses": 0, "ties": 0} for cat in categories}
    
    # Process each week
    for matchup_period in range(1, max_week + 1):
        box_scores = get_box_scores(league, matchup_period)
        team_box_score = find_team_box_score(box_scores, team_name)
        
        if team_box_score is None:
            continue
        
        # Determine if team is home or away
        home_name = team_label(getattr(team_box_score, "home_team", None))
        is_home = team_name == home_name
        side = "home" if is_home else "away"
        
        # Get stats for this side
        side_stats = getattr(team_box_score, f"{side}_stats", {}) or {}
        
        # Process each category
        for cat_name in categories:
            if cat_name not in side_stats:
                continue
            
            cat_data = side_stats[cat_name]
            if isinstance(cat_data, dict):
                result = cat_data.get("result") or cat_data.get("winner")
                if result in {"WIN", "W"}:
                    stats[cat_name]["wins"] += 1
                elif result in {"LOSS", "L"}:
                    stats[cat_name]["losses"] += 1
                else:
                    stats[cat_name]["ties"] += 1
    
    return stats


def build_category_stats(league: League, team: Any) -> dict[str, dict[str, Any]]:
    """Calculate category stats for regular season and playoffs separately."""
    current_period = getattr(league, "currentMatchupPeriod", 1) or 1
    
    # Regular season: Week 1-22
    regular_season_stats = calculate_stats_for_weeks(league, team, min(22, int(current_period)))
    
    # Playoffs: Week 23-24 (only if current period > 22)
    playoff_stats = None
    if int(current_period) > 22:
        # Calculate stats from Week 23 to current period (max 24)
        playoff_start = 23
        playoff_end = min(24, int(current_period))
        
        # Get total stats up to playoff_end
        total_stats = calculate_stats_for_weeks(league, team, playoff_end)
        
        # Subtract regular season to get playoff stats only
        categories = ["R", "HR", "RBI", "SB", "AVG", "K", "W", "SV", "ERA", "WHIP"]
        playoff_stats = {cat: {"wins": 0, "losses": 0, "ties": 0} for cat in categories}
        
        for cat in categories:
            playoff_stats[cat]["wins"] = total_stats[cat]["wins"] - regular_season_stats[cat]["wins"]
            playoff_stats[cat]["losses"] = total_stats[cat]["losses"] - regular_season_stats[cat]["losses"]
            playoff_stats[cat]["ties"] = total_stats[cat]["ties"] - regular_season_stats[cat]["ties"]
    
    return {
        "regularSeason": regular_season_stats,
        "playoffs": playoff_stats
    }


def build_teams(league: League) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for index, team in enumerate(sorted(league.teams, key=team_label), start=1):
        rows.append(
            {
                "teamId": getattr(team, "team_id", index),
                "name": team_label(team),
                "record": team_record(team),
                "wins": getattr(team, "wins", 0),
                "losses": getattr(team, "losses", 0),
                "ties": getattr(team, "ties", 0),
                "owner": getattr(team, "owner", "-"),
                "rosterSize": len(getattr(team, "roster", [])),
                "rosterComposition": build_roster_composition(team),
                "roster": build_roster(team),
                "weeklyTrend": build_weekly_trend(league, team),
                "categoryStats": build_category_stats(league, team),
            }
        )
    return rows


def build_snapshot(config: FetcherConfig, league: League) -> dict[str, Any]:
    standings = build_standings(league)
    matchups = build_matchups(league)
    teams = build_teams(league)

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "league": {
            "id": config.league_id,
            "season": config.season_year,
            "name": getattr(league, "settings", {}).get("name", "ESPN Fantasy Baseball League") if isinstance(getattr(league, "settings", None), dict) else "ESPN Fantasy Baseball League",
            "currentMatchupPeriod": getattr(league, "currentMatchupPeriod", None),
            "teamCount": len(teams),
        },
        "standings": standings,
        "matchups": matchups,
        "teams": teams,
    }


def main() -> None:
    config = parse_config()
    league = load_league(config)
    snapshot = build_snapshot(config, league)

    config.output_path.parent.mkdir(parents=True, exist_ok=True)
    config.output_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")
    print(f"Wrote snapshot to {config.output_path}")


if __name__ == "__main__":
    main()
