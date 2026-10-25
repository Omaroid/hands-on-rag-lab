"""Original educational notes; never presented as fetched official documentation."""

import json
from pathlib import Path

from lakehouse.chunking import split_document

NOTES = [
    (
        "unity-overview",
        "Unity Catalog : gouvernance unifiée",
        "Unity Catalog",
        "https://docs.databricks.com/en/data-governance/unity-catalog/index.html",
        (
            "Unity Catalog centralise la gouvernance des données et des objets IA d"
            "ans Databricks. Les objets de données suivent la hiérarchie catalogue,"
            " schéma, table. Les permissions d'accès, la traçabilité lineage et l'a"
            "udit contribuent à une gouvernance cohérente."
        ),
    ),
    (
        "unity-grants",
        "Unity Catalog : privilèges et accès",
        "Unity Catalog",
        (
            "https://docs.databricks.com/en/data-governance/unity-catalog/manage-pr"
            "ivileges/index.html"
        ),
        (
            "Les privilèges Unity Catalog contrôlent les actions autorisées sur les"
            " objets. Lire une table nécessite les privilèges appropriés sur la tab"
            "le ainsi que USE CATALOG et USE SCHEMA sur ses parents. Accorder les p"
            "ermissions à des groupes simplifie la gestion des accès."
        ),
    ),
    (
        "unity-lineage",
        "Lineage : traçabilité des données",
        "Unity Catalog",
        "https://docs.databricks.com/en/data-governance/unity-catalog/data-lineage.html",
        (
            "Le lineage Unity Catalog décrit les relations entre les données source"
            "s et les données produites. La traçabilité aide à comprendre les dépen"
            "dances entre tables et l'impact d'un changement. La visibilité dépend "
            "des permissions et des opérations prises en charge."
        ),
    ),
    (
        "unity-external",
        "Tables managées et tables externes",
        "Unity Catalog",
        "https://docs.databricks.com/en/tables/managed.html",
        (
            "Une table managée délègue à Unity Catalog la gestion du stockage et du"
            " cycle de vie des données. Pour une table externe, les fichiers resten"
            "t sous la responsabilité du propriétaire du stockage externe. Supprime"
            "r la définition d'une table externe ne supprime pas ses fichiers."
        ),
    ),
    (
        "unity-volumes",
        "Volumes Unity Catalog",
        "Unity Catalog",
        "https://docs.databricks.com/en/volumes/index.html",
        (
            "Les volumes Unity Catalog gouvernent les fichiers non tabulaires. Un v"
            "olume appartient à un catalogue et à un schéma. Les permissions READ V"
            "OLUME et WRITE VOLUME contrôlent les opérations sur les fichiers."
        ),
    ),
    (
        "delta-acid",
        "Delta Lake : transactions ACID",
        "Delta Lake",
        "https://docs.delta.io/latest/introduction.html",
        (
            "Delta Lake apporte des transactions ACID aux tables d'un lac de donnée"
            "s. Le journal de transactions décrit les versions cohérentes de la tab"
            "le et les fichiers associés. Les transactions permettent de coordonner"
            " des lectures et des écritures concurrentes."
        ),
    ),
    (
        "delta-time",
        "Time travel et historique Delta",
        "Delta Lake",
        "https://docs.delta.io/latest/delta-batch.html",
        (
            "Le time travel Delta Lake permet de lire une version antérieure d'une "
            "table par version ou par timestamp. Les fichiers et le journal nécessa"
            "ires doivent encore être disponibles. Une politique de rétention et VA"
            "CUUM influencent la disponibilité de cet historique."
        ),
    ),
    (
        "delta-vacuum",
        "VACUUM et rétention des fichiers",
        "Delta Lake",
        "https://docs.delta.io/latest/delta-utility.html",
        (
            "VACUUM supprime les fichiers de données qui ne sont plus référencés et"
            " dont la rétention a expiré. Une rétention trop courte peut compromett"
            "re les lecteurs concurrents et le time travel. Il faut vérifier les du"
            "rées maximales des traitements avant de réduire la rétention."
        ),
    ),
    (
        "delta-merge",
        "MERGE : insertions et mises à jour",
        "Delta Lake",
        "https://docs.delta.io/latest/delta-update.html",
        (
            "MERGE INTO permet de combiner insertions, mises à jour et suppressions"
            " dans une table Delta selon une condition de correspondance. Dédupliqu"
            "er la source évite les correspondances ambiguës. Une stratégie d'upser"
            "t doit aussi traiter l'idempotence des chargements."
        ),
    ),
    (
        "delta-schema",
        "Schema enforcement et évolution",
        "Delta Lake",
        "https://docs.delta.io/latest/delta-batch.html",
        (
            "Le schema enforcement vérifie que les données écrites sont compatibles"
            " avec le schéma de la table Delta. Le schema evolution autorise des ch"
            "angements de schéma explicitement configurés. Il faut distinguer le co"
            "ntrôle de compatibilité de l'activation volontaire d'une évolution."
        ),
    ),
    (
        "delta-cdf",
        "Change Data Feed : changements Delta",
        "Delta Lake",
        "https://docs.delta.io/latest/delta-change-data-feed.html",
        (
            "Le Change Data Feed expose les changements de lignes d'une table Delta"
            " après son activation. Il facilite les traitements incrémentaux et la "
            "propagation des insertions, mises à jour et suppressions. La rétention"
            " limite la durée de lecture des anciens changements."
        ),
    ),
    (
        "delta-optimize",
        "OPTIMIZE : compaction des fichiers",
        "Delta Lake",
        "https://docs.delta.io/latest/optimizations-oss.html",
        (
            "La compaction OPTIMIZE regroupe des petits fichiers Delta pour amélior"
            "er l'efficacité des lectures. Son intérêt dépend du volume, des écritu"
            "res et des motifs de lecture. Une optimisation consomme du calcul et d"
            "oit être évaluée en fonction du gain attendu."
        ),
    ),
    (
        "lakehouse",
        "Lakehouse : lac et entrepôt de données",
        "Databricks",
        "https://docs.databricks.com/en/lakehouse/index.html",
        (
            "Une architecture Lakehouse rapproche la flexibilité d'un lac de donnée"
            "s et les capacités de gestion d'un entrepôt. Les formats ouverts de ta"
            "ble apportent des garanties transactionnelles et une organisation des "
            "métadonnées. Le stockage, le calcul et la gouvernance restent des resp"
            "onsabilités distinctes."
        ),
    ),
    (
        "medallion",
        "Architecture médaillon : bronze, silver, gold",
        "Databricks",
        "https://docs.databricks.com/en/lakehouse/medallion.html",
        (
            "L'architecture médaillon organise les données en couches bronze, silve"
            "r et gold. Bronze conserve les données brutes, silver nettoie et conso"
            "lide les données, gold fournit des jeux adaptés aux usages métier. Ces"
            " couches expriment des niveaux de qualité et de préparation."
        ),
    ),
    (
        "autoloader",
        "Auto Loader : ingestion incrémentale",
        "Databricks",
        ("https://docs.databricks.com/en/ingestion/cloud-object-storage/auto-loader/index.html"),
        (
            "Auto Loader ingère de façon incrémentale des fichiers arrivant dans un"
            " stockage objet. Les checkpoints conservent l'état du traitement et pe"
            "rmettent la reprise. Le choix des options de schéma et de découverte d"
            "es fichiers influence la robustesse de l'ingestion."
        ),
    ),
    (
        "streaming",
        "Structured Streaming et checkpoints",
        "Databricks",
        "https://docs.databricks.com/en/structured-streaming/index.html",
        (
            "Structured Streaming exprime des traitements incrémentaux sur des flux"
            " de données. Un checkpoint durable conserve la progression et l'état n"
            "écessaires à la reprise. La garantie de bout en bout dépend des source"
            "s, des transformations et de la destination."
        ),
    ),
    (
        "azure-identity",
        "Azure Databricks et identité Entra",
        "Azure",
        "https://learn.microsoft.com/en-us/azure/databricks/admin/users-groups/",
        (
            "Azure Databricks s'intègre aux identités Microsoft Entra ID. Les utili"
            "sateurs, groupes et identités de service servent à contrôler l'accès a"
            "ux espaces de travail et aux données. Une identité managée peut éviter"
            " la gestion de secrets pour certains accès Azure pris en charge."
        ),
    ),
    (
        "azure-storage",
        "Azure : identifiants de stockage et emplacements",
        "Azure",
        ("https://learn.microsoft.com/en-us/azure/databricks/connect/unity-catalog/cloud-storage/"),
        (
            "Dans Azure Databricks, un identifiant de stockage représente une ident"
            "ité d'accès au stockage cloud. Un emplacement externe associe un chemi"
            "n de stockage à cet identifiant. Les permissions Unity Catalog contrôl"
            "ent l'utilisation de ces objets."
        ),
    ),
    (
        "azure-network",
        "Azure Databricks : isolation réseau",
        "Azure",
        "https://learn.microsoft.com/en-us/azure/databricks/security/network/",
        (
            "L'isolation réseau Azure Databricks dépend des chemins de communicatio"
            "n à protéger. Private Link permet des connexions privées pour les flux"
            " pris en charge. Une architecture réseau doit considérer séparément l'"
            "accès utilisateur, le plan de contrôle et les données."
        ),
    ),
    (
        "governance-mask",
        "Sécurité : filtres de lignes et masquage",
        "Gouvernance",
        (
            "https://docs.databricks.com/en/data-governance/unity-catalog/filters-a"
            "nd-masks/index.html"
        ),
        (
            "Les filtres de lignes limitent les lignes accessibles et les masques d"
            "e colonnes adaptent les valeurs visibles. Ces politiques complètent le"
            "s privilèges sur les objets. Il faut tester les accès avec les identit"
            "és réellement utilisées par les consommateurs."
        ),
    ),
    (
        "governance-audit",
        "Audit : observer les accès et opérations",
        "Gouvernance",
        "https://docs.databricks.com/en/admin/system-tables/audit-logs.html",
        (
            "Les événements d'audit documentent des accès et des opérations sur la "
            "plateforme. Leur disponibilité et leur couverture doivent être vérifié"
            "es pour le périmètre utilisé. Les journaux d'audit doivent eux-mêmes ê"
            "tre protégés et soumis à une politique de rétention."
        ),
    ),
    (
        "finops",
        "FinOps : maîtriser le coût du calcul",
        "Gouvernance",
        "https://docs.databricks.com/en/admin/account-settings/usage.html",
        (
            "Une démarche FinOps rapproche les coûts du calcul, du stockage et des "
            "usages métier. Les politiques de calcul, les tags et l'arrêt automatiq"
            "ue contribuent à maîtriser les coûts Databricks. Une alerte budgétaire"
            " seule ne constitue pas nécessairement une coupure de facturation."
        ),
    ),
    (
        "delta-sharing",
        "Delta Sharing : partager des données",
        "Databricks",
        "https://docs.databricks.com/en/delta-sharing/index.html",
        (
            "Delta Sharing est un protocole ouvert de partage de données. Un fourni"
            "sseur définit les données partagées et les destinataires autorisés. Le"
            "s contrôles de gouvernance et de révocation restent essentiels pour gé"
            "rer le cycle de vie du partage."
        ),
    ),
    (
        "quality",
        "Qualité des données et contrats",
        "Gouvernance",
        "https://docs.databricks.com/en/lakehouse/medallion.html",
        (
            "La qualité des données se vérifie par des règles explicites de complét"
            "ude, validité et cohérence. Les couches silver et gold d'une architect"
            "ure médaillon rendent ces contrôles visibles. Un contrat de données pr"
            "écise les attentes, les propriétaires et le traitement des anomalies."
        ),
    ),
]


def main() -> None:
    chunks = []
    for key, title, product, url, text in NOTES:
        chunks.extend(
            split_document(
                "# " + title + "\n\n" + text,
                url=url + "#note-" + key,
                title=title,
                product=product,
                retrieved_at=None,
            )
        )
    # Citation URLs preserve exact configured reference, while IDs separate editorial notes.
    for chunk, note in zip(chunks, NOTES, strict=True):
        chunk.url = note[3]
    Path("corpus/editorial.json").write_text(
        json.dumps([c.model_dump() for c in chunks], ensure_ascii=False, indent=2) + "\n"
    )
    sources = list({n[3]: {"url": n[3], "product": n[2], "title": n[1]} for n in NOTES}.values())
    Path("config/sources.json").write_text(
        json.dumps(
            {
                "user_agent": "LakehouseRAGLab/0.1",
                "max_pages": 30,
                "max_bytes": 1000000,
                "delay_seconds": 2,
                "sources": sources,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(f"{len(chunks)} notes originales, {len(sources)} URLs candidates, aucune page ingérée")


if __name__ == "__main__":
    main()
