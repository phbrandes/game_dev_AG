import { SessionContext } from './SessionContext.js';
import { GlobalProfileState } from './GlobalProfileState.js';

export class SessionHarvester {
    public static execute(session: SessionContext, profile: GlobalProfileState): void {
        if (!session.isCoreBreached) {
            return;
        }

        // Convert session score to meta-currency. Using a standard 10% conversion rate for now.
        const gainedCurrency = Math.floor(session.score * 0.1);
        
        profile.data.metaCurrency += gainedCurrency;
        profile.save();

        // Force garbage collection of SessionContext
        session.reset();
    }
}
