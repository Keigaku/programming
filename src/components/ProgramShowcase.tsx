import { Check, ExternalLink } from 'lucide-react';
import type { HydratedAmazonProgram } from '@/lib/data/store';

interface ProgramShowcaseProps {
  programs: HydratedAmazonProgram[];
  showOperatorHint?: boolean;
}

export function ProgramShowcase({
  programs,
  showOperatorHint = false,
}: ProgramShowcaseProps) {
  return (
    <div className="programs-grid">
      {programs.map((program) => (
        <article className="program-card" key={program.id} id={`program-card-${program.id}`}>
          <div className="program-top">
            <span className="program-audience">{program.targetAudience.split('・')[0]}向け</span>
            <span className="program-tag">
              {showOperatorHint ? program.badge : 'Amazon公式特典'}
            </span>
          </div>

          <h3 className="program-name">{program.name}</h3>
          <p className="program-headline">{program.headline}</p>
          <p className="program-summary">{program.summary}</p>

          <ul className="program-list">
            {program.highlights.map((item) => (
              <li key={item}>
                <Check size={15} className="program-check" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 'auto' }}>
            <a
              href={program.affiliateUrl}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="btn btn-amazon"
              style={{ width: '100%' }}
              id={`cta-program-${program.id}`}
            >
              {program.ctaLabel}
              <ExternalLink size={15} />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
