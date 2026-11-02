// search_blog_reviews 단독 실행 테스트: npm run test:blog  (키는 .env.local, 출력에 키는 나오지 않는다)
import { searchBlogReviews } from '../server/blogReviews.js';
import { findCitrusEvidence } from '../server/citrusEvidence.js';

const reviews = await searchBlogReviews({ query: '서귀포 카페 감귤 메뉴', size: 8 });
console.log(`후기 ${reviews.length}건`);
for (const r of reviews.slice(0, 3)) console.log(`- ${r.title} | ${r.blog} | ${r.date}\n  ${r.url}`);
const ev = findCitrusEvidence(reviews);
console.log('\n감귤 근거:', ev.status, `(${ev.hits.length}건, 첫 단어: ${ev.hits[0]?.word ?? '-'})`);
