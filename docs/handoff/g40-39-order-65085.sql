-- G40-39 / completion photos — why order 65085 offered no photo option.
-- Run against the OPEN SSM tunnel:  psql "host=127.0.0.1 port=15432 dbname=gopher_prod user=gopher_readonly sslmode=require" -f this_file
-- Reader endpoint (cluster-ro) = physically cannot write. Port MUST be 15432 (.pgpass is keyed to it).

\echo '=== 1. The order itself. age_restricted? = true means the photo step is SKIPPED BY DESIGN (G40-192). ==='
SELECT id,
       "age_restricted?"       AS age_restricted,
       category_type,
       aasm_state,
       gopher_id,
       createdon,
       updatedon
FROM orders
WHERE id = 65085;

\echo ''
\echo '=== 2. Its order log — did it even reach Order Completed? ==='
SELECT id, notes, createdon
FROM order_logs
WHERE order_id = 65085
ORDER BY id;

\echo ''
\echo '=== 3. Any attachments at all on it, of any type? ==='
SELECT id, attachable_type, file, createdon
FROM attachments
WHERE order_id = 65085
ORDER BY id;

\echo ''
\echo '=== 4. THE POPULATION QUESTION. Completion photos stopped at order 64910 (2026-08-28).'
\echo '    If most of these are age_restricted=false, the capture step regressed. ==='
SELECT o."age_restricted?" AS age_restricted,
       o.category_type,
       count(*)                                   AS completed_orders,
       count(a.id)                                AS with_completion_photo
FROM orders o
LEFT JOIN attachments a
       ON a.order_id = o.id
      AND a.attachable_type = 'COMPLETED_ORDER'
WHERE o.id > 64910
  AND o.aasm_state IN ('delivered','completed')
GROUP BY 1, 2
ORDER BY completed_orders DESC;

\echo ''
\echo '=== 5. Sanity: the same split BEFORE the cutoff, for comparison ==='
SELECT o."age_restricted?" AS age_restricted,
       count(*)            AS completed_orders,
       count(a.id)         AS with_completion_photo
FROM orders o
LEFT JOIN attachments a
       ON a.order_id = o.id
      AND a.attachable_type = 'COMPLETED_ORDER'
WHERE o.id BETWEEN 64600 AND 64910
  AND o.aasm_state IN ('delivered','completed')
GROUP BY 1
ORDER BY 1;
